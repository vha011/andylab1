// Cổng auto-merge cho PR vào `dev`. Chạy từ workflow auto-merge.yml (actions/github-script).
// Logic nằm ở đây để test được (xem auto-merge.test.js); workflow chỉ gọi run().

const AI_REVIEW_CONTEXT = "ai-review";
const BLOCKING_LABELS = ["do-not-merge", "needs-human"];
const PROTECTED_BRANCHES = ["dev", "main"];
const PASSING_CONCLUSIONS = ["success", "neutral", "skipped"];

// Review mới nhất của mỗi người (bỏ tác giả PR, bỏ COMMENTED/PENDING). Chỉ dùng để CHẶN (Changes requested).
function latestReviewPerUser(reviews, author) {
  const latest = new Map();
  for (const r of reviews) {
    if (!r.user || r.user.login === author) continue;
    if (r.state === "COMMENTED" || r.state === "PENDING") continue;
    latest.set(r.user.login, r);
  }
  return [...latest.values()].filter((r) => r.state !== "DISMISSED");
}

// Status ai-review mới nhất trên đúng head SHA (API trả mới nhất trước). Status gắn theo SHA nên push mới tự vô hiệu duyệt cũ.
function latestAiStatus(statuses) {
  return statuses.find((s) => s.context === AI_REVIEW_CONTEXT) ?? null;
}

// Reviewer phải khác author. Khác tài khoản GitHub là đủ; nếu dùng chung một tài khoản bot thì
// description của status phải có "by <session-id>" khác với "Author-session: <id>" trong mô tả PR.
function isIndependentReviewer(status, pr) {
  if (status.creator?.login && status.creator.login !== pr.user.login) return true;
  const reviewer = /\bby (\S+)/.exec(status.description ?? "")?.[1];
  const author = /Author-session:\s*(\S+)/i.exec(pr.body ?? "")?.[1];
  return Boolean(reviewer && author && reviewer !== author);
}

function evaluate({ pr, mergeableState, behindBy, reviews, statuses, checkRuns }) {
  const labels = pr.labels.map((l) => l.name);
  if (pr.draft) return { ok: false, reason: "draft" };
  if (labels.some((l) => BLOCKING_LABELS.includes(l))) return { ok: false, reason: "có nhãn chặn" };
  if (pr.head.repo?.full_name !== pr.base.repo.full_name) return { ok: false, reason: "PR từ fork" };

  const latest = latestReviewPerUser(reviews, pr.user.login);
  if (latest.some((r) => r.state === "CHANGES_REQUESTED")) return { ok: false, reason: "còn Changes requested" };

  const ai = latestAiStatus(statuses);
  if (!ai) return { ok: false, reason: "chưa có ai-review trên commit hiện tại" };
  if (ai.state === "failure" || ai.state === "error") return { ok: false, reason: "ai-review từ chối" };
  if (ai.state !== "success") return { ok: false, reason: `ai-review đang ${ai.state}` };
  if (!isIndependentReviewer(ai, pr)) return { ok: false, reason: "ai-review không chứng minh được reviewer độc lập với author" };

  // Không có check nào nghĩa là chưa có cổng gác, không được coi là xanh.
  if (checkRuns.length === 0) return { ok: false, reason: "chưa có check nào chạy" };
  const bad = checkRuns.find((c) => c.status !== "completed" || !PASSING_CONCLUSIONS.includes(c.conclusion));
  if (bad) return { ok: false, reason: `check chưa xanh: ${bad.name}` };

  const latestByContext = new Map();
  for (const s of statuses) if (s.context !== AI_REVIEW_CONTEXT && !latestByContext.has(s.context)) latestByContext.set(s.context, s.state);
  for (const [ctx, state] of latestByContext) if (state !== "success") return { ok: false, reason: `status chưa xanh: ${ctx}` };

  // Không dựa vào branch protection "up to date": tự kiểm head đã chứa đủ dev.
  if (behindBy !== 0) return { ok: false, reason: `PR tụt sau dev ${behindBy} commit (author phải rebase và xin review lại)` };
  if (mergeableState !== "clean") return { ok: false, reason: `mergeable_state=${mergeableState}` };
  return { ok: true, reason: "đủ điều kiện" };
}

async function run({ github, context, core }) {
  const { owner, repo } = context.repo;
  const prs = await github.paginate(github.rest.pulls.list, { owner, repo, state: "open", base: "dev", per_page: 100 });
  prs.sort((a, b) => a.number - b.number);

  for (const listed of prs) {
    const { data: pr } = await github.rest.pulls.get({ owner, repo, pull_number: listed.number });
    const ref = pr.head.sha;
    // github.paginate đã chuẩn hóa response của checks.listForRef về mảng check_runs.
    const [reviews, statuses, checkRuns, cmp] = await Promise.all([
      github.paginate(github.rest.pulls.listReviews, { owner, repo, pull_number: pr.number, per_page: 100 }),
      github.paginate(github.rest.repos.listCommitStatusesForRef, { owner, repo, ref, per_page: 100 }),
      github.paginate(github.rest.checks.listForRef, { owner, repo, ref, per_page: 100 }),
      github.rest.repos.compareCommitsWithBasehead({ owner, repo, basehead: `${pr.head.sha}...${pr.base.ref}`, per_page: 1 }),
    ]);

    const verdict = evaluate({ pr, mergeableState: pr.mergeable_state, behindBy: cmp.data.ahead_by, reviews, statuses, checkRuns });
    core.info(`PR #${pr.number}: ${verdict.ok ? "MERGE" : "bỏ qua"} — ${verdict.reason}`);
    if (!verdict.ok) continue;

    try {
      // `sha` đảm bảo chỉ merge đúng commit đã được duyệt và có check xanh.
      await github.rest.pulls.merge({ owner, repo, pull_number: pr.number, merge_method: "squash", sha: ref, commit_title: `${pr.title} (#${pr.number})` });
      if (!PROTECTED_BRANCHES.includes(pr.head.ref)) {
        await github.rest.git.deleteRef({ owner, repo, ref: `heads/${pr.head.ref}` }).catch((e) => core.warning(`Không xóa được nhánh ${pr.head.ref}: ${e.message}`));
      }
      core.info(`Đã merge PR #${pr.number}`);
      // Mỗi lượt chỉ merge 1 PR: các PR còn lại đã lệch dev, author phải rebase rồi xin review lại.
      return;
    } catch (err) {
      core.warning(`Không thể merge PR #${pr.number}: ${err.message}`);
    }
  }
}

module.exports = { run, evaluate, latestReviewPerUser, latestAiStatus, isIndependentReviewer };
