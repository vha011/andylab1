const test = require("node:test");
const assert = require("node:assert");
const { evaluate } = require("./auto-merge.js");

const SHA = "abc123";
const basePr = () => ({
  draft: false,
  labels: [],
  user: { login: "author-bot" },
  head: { sha: SHA, ref: "feature/x", repo: { full_name: "o/r" } },
  base: { repo: { full_name: "o/r" } },
});
const okChecks = [{ name: "gate", status: "completed", conclusion: "success" }];
const aiOk = [{ context: "ai-review", state: "success" }];
const input = (over = {}) => ({ pr: basePr(), mergeableState: "clean", reviews: [], statuses: aiOk, checkRuns: okChecks, ...over });

test("ai-review success + check xanh + clean => merge", () => assert.ok(evaluate(input()).ok));

test("không có check nào => không merge", () => assert.match(evaluate(input({ checkRuns: [] })).reason, /chưa có check/));

test("check đang chạy hoặc fail => không merge", () => {
  assert.ok(!evaluate(input({ checkRuns: [{ name: "gate", status: "in_progress", conclusion: null }] })).ok);
  assert.ok(!evaluate(input({ checkRuns: [{ name: "gate", status: "completed", conclusion: "failure" }] })).ok);
});

test("không có duyệt => không merge", () => assert.ok(!evaluate(input({ statuses: [] })).ok));

test("ai-review failure chặn kể cả khi có APPROVED", () => {
  const reviews = [{ user: { login: "h" }, state: "APPROVED", commit_id: SHA }];
  assert.ok(!evaluate(input({ statuses: [{ context: "ai-review", state: "failure" }], reviews })).ok);
});

test("ai-review mới nhất (đầu danh sách) quyết định", () => {
  const statuses = [{ context: "ai-review", state: "success" }, { context: "ai-review", state: "failure" }];
  assert.ok(evaluate(input({ statuses })).ok);
});

test("APPROVED native trên đúng head SHA => merge", () => {
  const reviews = [{ user: { login: "h" }, state: "APPROVED", commit_id: SHA }];
  assert.ok(evaluate(input({ statuses: [], reviews })).ok);
});

test("APPROVED trên commit cũ không tính", () => {
  const reviews = [{ user: { login: "h" }, state: "APPROVED", commit_id: "old" }];
  assert.ok(!evaluate(input({ statuses: [], reviews })).ok);
});

test("tác giả tự approve không tính", () => {
  const reviews = [{ user: { login: "author-bot" }, state: "APPROVED", commit_id: SHA }];
  assert.ok(!evaluate(input({ statuses: [], reviews })).ok);
});

test("Changes requested mới nhất chặn; approve sau đó thì gỡ", () => {
  const cr = { user: { login: "h" }, state: "CHANGES_REQUESTED", commit_id: SHA };
  assert.ok(!evaluate(input({ reviews: [cr] })).ok);
  assert.ok(evaluate(input({ reviews: [cr, { user: { login: "h" }, state: "APPROVED", commit_id: SHA }] })).ok);
});

test("draft, nhãn needs-human, fork, behind => không merge", () => {
  assert.ok(!evaluate(input({ pr: { ...basePr(), draft: true } })).ok);
  assert.ok(!evaluate(input({ pr: { ...basePr(), labels: [{ name: "needs-human" }] } })).ok);
  assert.ok(!evaluate(input({ pr: { ...basePr(), head: { sha: SHA, ref: "x", repo: { full_name: "fork/r" } } } })).ok);
  assert.ok(!evaluate(input({ mergeableState: "behind" })).ok);
});

test("status ngoài ai-review đang pending => không merge", () => {
  assert.ok(!evaluate(input({ statuses: [...aiOk, { context: "lint", state: "pending" }] })).ok);
});
