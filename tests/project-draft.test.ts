import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { NextRequest } from "next/server";
import {
  projectInputSchema,
  projectDraftContext,
  parseProjectDraft,
  applyProjectDraft,
} from "../lib/project-draft";
import { emptyWorkspace } from "../lib/seed";
const input = {
  category: "프로젝트" as const,
  about: "팀 프로젝트에서 웹사이트를 만들었어요.",
  contribution: "React로 로그인 화면을 만들고 오류를 수정했어요.",
  outcome: "",
  additional: "",
};
const result = {
  draft: {
    title: "로그인 화면 구현",
    role: "로그인 화면 구현 담당",
    problem: "",
    action: "React로 로그인 화면을 만들고 오류를 수정했습니다.",
    result: "",
    learning: "",
    tags: ["React", "Python"],
  },
  sources: {
    title: ["contribution"],
    role: ["contribution"],
    problem: [],
    action: ["contribution"],
    result: [],
    learning: [],
  },
  questions: [{ field: "result", question: "확인한 변화나 결과가 있나요?" }],
};
test("one short description is enough; oversized and private input is rejected", () => {
  assert.ok(
    projectInputSchema.safeParse({ ...input, contribution: "" }).success,
  );
  assert.ok(!projectInputSchema.safeParse({ ...input, about: "   " }).success);
  assert.ok(
    !projectInputSchema.safeParse({ ...input, contribution: "x".repeat(2001) })
      .success,
  );
  assert.ok(
    !projectInputSchema.safeParse({ ...input, privateNote: "Do not transmit" })
      .success,
  );
  const profile = {
    ...emptyWorkspace().profile,
    name: "Private person",
    email: "private@example.invalid",
  };
  const context = projectDraftContext(profile, input);
  assert.ok(!JSON.stringify(context).includes("Private person"));
  assert.ok(!JSON.stringify(context).includes("private@example.invalid"));
  assert.deepEqual(Object.keys(context), ["profile", "experience"]);
});
test("drafts require actual cited answers and reject invented figures and unsafe structure", () => {
  const parsed = parseProjectDraft(JSON.stringify(result), input);
  assert.equal(parsed.draft.result, "");
  assert.deepEqual(parsed.draft.tags, ["React"]);
  assert.throws(
    () =>
      parseProjectDraft(
        JSON.stringify({
          ...result,
          sources: { ...result.sources, action: ["outcome"] },
        }),
        input,
      ),
    /근거/,
  );
  assert.throws(
    () =>
      parseProjectDraft(
        JSON.stringify({
          ...result,
          sources: { ...result.sources, action: [] },
        }),
        input,
      ),
    /근거/,
  );
  assert.throws(
    () =>
      parseProjectDraft(
        JSON.stringify({
          ...result,
          draft: { ...result.draft, result: "성과가 30% 개선됐습니다." },
          sources: { ...result.sources, result: ["contribution"] },
        }),
        input,
      ),
    /수치/,
  );
  assert.throws(
    () =>
      parseProjectDraft(
        JSON.stringify({
          ...result,
          draft: { ...result.draft, privateNote: "unsafe" },
        }),
        input,
      ),
    /형식/,
  );
  assert.throws(() => parseProjectDraft("{not complete", input), /형식/);
});
test("selective application preserves identity, manual content, private notes and link", () => {
  const project = {
    id: "original",
    title: "Manual title",
    category: "프로젝트",
    period: "2026.03",
    role: "Manual role",
    problem: "Original problem",
    action: "Original action",
    result: "Original result",
    learning: "Original learning",
    tags: ["Figma"],
    link: "https://example.invalid",
    privateNote: "Private note",
  };
  const parsed = parseProjectDraft(JSON.stringify(result), input);
  const applied = applyProjectDraft(project, parsed, ["action"], false);
  assert.equal(applied.action, parsed.draft.action);
  for (const key of [
    "id",
    "title",
    "role",
    "period",
    "problem",
    "result",
    "learning",
    "link",
    "privateNote",
  ] as const)
    assert.equal(applied[key], project[key]);
  assert.deepEqual(applied.tags, ["Figma"]);
  assert.equal(project.action, "Original action");
});
const dir = mkdtempSync(join(tmpdir(), "ieum-project-ai-"));
process.env.CAREERMAP_DATA_DIR = dir;
process.env.CAREERMAP_DATABASE_PROVIDER = "sqlite";
process.env.GROQ_API_KEY = "local-test-only";
process.env.CAREERMAP_AI_PROVIDER = "groq";
process.env.CAREERMAP_AI_MODEL = "openai/gpt-oss-120b";
delete process.env.VERCEL;
delete process.env.IEUM_ADMIN_EMAIL;
delete process.env.IEUM_ADMIN_USER_ID;
const store = await import("../lib/store");
const { query } = await import("../lib/database");
const ai = await import("../app/api/ai/route");
let token: string, userId: string;
const originalFetch = globalThis.fetch;
let requests: Record<string, any>[] = [];
let fakeStatus = 200,
  fakeContent = JSON.stringify(result);
before(async () => {
  const guest = await store.guestUser();
  token = guest.token;
  userId = guest.user.id;
  await store.saveWorkspace(userId, emptyWorkspace(), 0);
  globalThis.fetch = async (url, init) => {
    assert.equal(
      String(url),
      "https://api.groq.com/openai/v1/chat/completions",
    );
    requests.push(JSON.parse(String(init?.body)));
    return new Response(
      JSON.stringify({
        choices: [{ message: { content: fakeContent }, finish_reason: "stop" }],
      }),
      { status: fakeStatus, headers: { "Content-Type": "application/json" } },
    );
  };
});
after(async () => {
  globalThis.fetch = originalFetch;
  await store.closeDatabase();
  rmSync(dir, { recursive: true, force: true });
});
function request(body: unknown, session = token, origin = "http://ieum.test") {
  return new NextRequest("http://ieum.test/api/ai", {
    method: "POST",
    headers: {
      host: "ieum.test",
      origin,
      ...(session ? { cookie: "careermap_session=" + session } : {}),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}
test("API permits a first experience without saved projects and never saves AI proposals", async () => {
  const response = await ai.POST(
    request({
      task: "project",
      projectInput: input,
      profile: { name: "Injected name" },
    }),
  );
  assert.equal(response.status, 200);
  assert.equal((await response.json()).draft.action, result.draft.action);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].response_format.type, "json_schema");
  assert.equal(requests[0].response_format.json_schema.strict, true);
  assert.equal(
    requests[0].response_format.json_schema.schema.properties.sources
      .additionalProperties,
    false,
  );
  const context = JSON.parse(requests[0].messages[1].content);
  assert.deepEqual(context.experience, input);
  assert.deepEqual(Object.keys(context.profile), [
    "type",
    "background",
    "role",
  ]);
  assert.ok(!JSON.stringify(context).includes("Injected name"));
  assert.deepEqual(
    JSON.parse((await store.findSession(token))!.state).projects,
    [],
  );
});
test("API rejects missing sessions, foreign origins and invalid answers before consuming AI quota", async () => {
  const prior = requests.length;
  assert.equal(
    (await ai.POST(request({ task: "project", projectInput: input }, "")))
      .status,
    401,
  );
  assert.equal(
    (
      await ai.POST(
        request(
          { task: "project", projectInput: input },
          token,
          "https://foreign.test",
        ),
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await ai.POST(
        request({ task: "project", projectInput: { ...input, about: "" } }),
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await ai.POST(
        request({
          task: "project",
          projectInput: { ...input, privateNote: "Not allowed" },
        }),
      )
    ).status,
    400,
  );
  assert.equal((await ai.POST(request(null))).status, 400);
  assert.equal(requests.length, prior);
  assert.equal(
    (
      await query<{ n: number }>(
        "SELECT count(*) AS n FROM ai_usage WHERE user_id=?",
        [userId],
      )
    ).rows[0].n,
    1,
  );
});
test("provider failures and malformed replies do not mutate the workspace", async () => {
  const before = (await store.findSession(token))!.state;
  fakeStatus = 429;
  const limited = await ai.POST(
    request({ task: "project", projectInput: input }),
  );
  assert.equal(limited.status, 502);
  assert.match((await limited.json()).error, /입력은 유지/);
  fakeStatus = 200;
  fakeContent = "{bad JSON";
  const malformed = await ai.POST(
    request({ task: "project", projectInput: input }),
  );
  assert.equal(malformed.status, 502);
  assert.match((await malformed.json()).error, /초안 형식/);
  assert.equal((await store.findSession(token))!.state, before);
});
