const test = require("node:test");
const assert = require("node:assert");
const { evaluate, run } = require("./auto-merge.js");

const SHA = "abc123";
const basePr = (over = {}) => ({
  draft: false,
  labels: [],
  number: 7,
  title: "feat: x",
  body: "Author-session: s-author",
  user: { login: "author-bot" },
  head: { sha: SHA, ref: "feature/x", repo: { full_name: "o/r" } },
  base: { ref: "dev", repo: { full_name: "o/r" } },
  mergeable_state: "clean",
  ...over,
});
const okChecks = [{ name: "gate", status: "completed", conclusion: "success" }];
const aiOk = { context: "ai-review", state: "success", creator: { login: "reviewer-bot" }, description: "Approved r1 by s-rev" };
const input = (over = {}) => ({ pr: basePr(), mergeableState: "clean", behindBy: 0, reviews: [], statuses: [aiOk], checkRuns: okChecks, ...over });

test("ai-review success từ reviewer khác + check xanh + clean => merge", () => assert.ok(evaluate(input()).ok));

test("không có check nào => không merge", () => assert.match(evaluate(input({ checkRuns: [] })).reason, /chưa có check/));

test("check đang chạy hoặc fail => không merge", () => {
  assert.ok(!evaluate(input({ checkRuns: [{ name: "gate", status: "in_progress", conclusion: null }] })).ok);
  assert.ok(!evaluate(input({ checkRuns: [{ name: "gate", status: "completed", conclusion: "failure" }] })).ok);
});

test("không có ai-review => không merge, kể cả khi có APPROVED native", () => {
  const reviews = [{ user: { login: "h" }, state: "APPROVED", commit_id: SHA }];
  assert.ok(!evaluate(input({ statuses: [], reviews })).ok);
});

test("ai-review failure hoặc pending => không merge", () => {
  assert.ok(!evaluate(input({ statuses: [{ ...aiOk, state: "failure" }] })).ok);
  assert.ok(!evaluate(input({ statuses: [{ ...aiOk, state: "pending" }] })).ok);
});

test("ai-review mới nhất (đầu danh sách) quyết định", () => {
  assert.ok(evaluate(input({ statuses: [aiOk, { ...aiOk, state: "failure" }] })).ok);
  assert.ok(!evaluate(input({ statuses: [{ ...aiOk, state: "failure" }, aiOk] })).ok);
});

test("author tự đặt ai-review bằng cùng tài khoản và cùng session => không merge", () => {
  const self = { ...aiOk, creator: { login: "author-bot" }, description: "Approved r1 by s-author" };
  assert.ok(!evaluate(input({ statuses: [self] })).ok);
});

test("cùng tài khoản bot nhưng session reviewer khác author => merge", () => {
  const same = { ...aiOk, creator: { login: "author-bot" }, description: "Approved r1 by s-rev" };
  assert.ok(evaluate(input({ statuses: [same] })).ok);
});

test("cùng tài khoản, thiếu Author-session trong PR => không merge", () => {
  const same = { ...aiOk, creator: { login: "author-bot" } };
  assert.ok(!evaluate(input({ pr: basePr({ body: "" }), statuses: [same] })).ok);
});

test("Changes requested của người khác chặn kể cả khi ai-review success; approve sau đó gỡ", () => {
  const cr = { user: { login: "h" }, state: "CHANGES_REQUESTED" };
  assert.ok(!evaluate(input({ reviews: [cr] })).ok);
  assert.ok(evaluate(input({ reviews: [cr, { user: { login: "h" }, state: "APPROVED" }] })).ok);
});

test("draft, nhãn needs-human, fork => không merge", () => {
  assert.ok(!evaluate(input({ pr: basePr({ draft: true }) })).ok);
  assert.ok(!evaluate(input({ pr: basePr({ labels: [{ name: "needs-human" }] }) })).ok);
  assert.ok(!evaluate(input({ pr: basePr({ head: { sha: SHA, ref: "x", repo: { full_name: "fork/r" } } }) })).ok);
});

test("tụt sau dev hoặc mergeable_state khác clean => không merge", () => {
  assert.match(evaluate(input({ behindBy: 2 })).reason, /tụt sau dev/);
  assert.ok(!evaluate(input({ mergeableState: "behind" })).ok);
});

test("status ngoài ai-review đang pending => không merge", () => {
  assert.ok(!evaluate(input({ statuses: [aiOk, { context: "lint", state: "pending" }] })).ok);
});

// run() với github giả mô phỏng octokit: paginate trả mảng đã chuẩn hóa (kể cả check_runs).
function fakeGithub({ pr = basePr(), reviews = [], statuses = [aiOk], checkRuns = okChecks, aheadBy = 0 } = {}) {
  const calls = { merged: [], deleted: [] };
  const endpoints = { list: [pr], reviews, statuses, checks: checkRuns };
  const rest = {
    pulls: { list: "list", listReviews: "reviews", get: async () => ({ data: pr }), merge: async (a) => calls.merged.push(a) },
    repos: { listCommitStatusesForRef: "statuses", compareCommitsWithBasehead: async () => ({ data: { ahead_by: aheadBy } }) },
    checks: { listForRef: "checks" },
    git: { deleteRef: async (a) => calls.deleted.push(a) },
  };
  return { github: { rest, paginate: async (fn) => endpoints[fn] }, calls };
}
const ctx = { repo: { owner: "o", repo: "r" } };
const core = { info() {}, warning() {} };

test("run(): đủ điều kiện => squash merge đúng SHA và xóa nhánh", async () => {
  const { github, calls } = fakeGithub();
  await run({ github, context: ctx, core });
  assert.strictEqual(calls.merged.length, 1);
  assert.strictEqual(calls.merged[0].sha, SHA);
  assert.strictEqual(calls.merged[0].merge_method, "squash");
  assert.deepStrictEqual(calls.deleted.map((d) => d.ref), ["heads/feature/x"]);
});

test("run(): tụt sau dev => không merge", async () => {
  const { github, calls } = fakeGithub({ aheadBy: 3 });
  await run({ github, context: ctx, core });
  assert.strictEqual(calls.merged.length, 0);
});
