import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { NextRequest } from "next/server";
import { sampleWorkspace } from "../lib/seed";
import {
  emptyResume,
  formatResume,
  formatCover,
  experienceEntry,
  resumeAiEvidence,
  aiDocumentText,
} from "../lib/document-builder";
import { workspaceSchema, validateRelationships } from "../lib/schema";
import { allReflectionQuestions, emptyReflection } from "../lib/reflection";
import { aiContext } from "../lib/ai";
import { experienceSignature } from "../lib/strategy";
import { copyDocumentToSpace } from "../lib/master";
import type { Workspace, Document } from "../lib/types";
const s = sampleWorkspace();
const resume = emptyResume(s.profile);
resume.email = "private@example.invalid";
resume.phone = "010-0000-0000";
resume.summary = "지원 직무를 준비합니다.";
resume.experiences = [experienceEntry(s.projects[0])];
const prompts = [
  {
    id: "prompt-1",
    question: "협업 경험을 설명해 주세요.",
    limit: 700,
    notes: "동료 의견을 정리했습니다.",
    answer: "협업 답변",
    projectIds: [s.projects[0].id],
  },
  {
    id: "prompt-2",
    question: "문제를 어떻게 해결했나요?",
    limit: 10,
    notes: "직접 점검했습니다.",
    answer: "두 번째 답변",
    projectIds: [],
  },
];
const documents: Document[] = [
  {
    id: "resume-test",
    jobId: s.jobs[0].id,
    kind: "이력서",
    title: "항목별 이력서",
    question: "",
    limit: 0,
    text: formatResume(resume),
    projectIds: [s.projects[0].id],
    versions: [],
    resume,
  },
  {
    id: "cover-test",
    jobId: s.jobs[0].id,
    kind: "자기소개서",
    title: "문항별 자소서",
    question: prompts[0].question,
    limit: 0,
    text: formatCover(prompts),
    projectIds: [s.projects[0].id],
    versions: [],
    prompts,
  },
];
s.documents = documents;
s.reflection = emptyReflection();
for (const q of allReflectionQuestions)
  s.reflection.answers[q.id] = q.section === "situation" ? q.choices[0].id : 4;
test("structured resumes and multi-prompt covers stay independent in company copies; old documents remain valid", () => {
  assert.ok(workspaceSchema.safeParse(s).success);
  assert.ok(validateRelationships(s));
  const copy = copyDocumentToSpace(s, documents[0], "");
  copy.resume!.experiences[0].description = "복사본의 설명";
  assert.notEqual(
    copy.resume!.experiences[0].description,
    resume.experiences[0].description,
  );
  const coverCopy = copyDocumentToSpace(s, documents[1], "");
  coverCopy.prompts![1].answer = "복사본 답변";
  assert.equal(prompts[1].answer, "두 번째 답변");
  assert.ok(formatResume(resume).includes("프로젝트 · 활동"));
  assert.ok(formatCover(prompts).includes(prompts[1].question));
  const invalid = structuredClone(s);
  invalid.documents[1].prompts![1].id = "prompt-1";
  assert.equal(validateRelationships(invalid), false);
  invalid.documents[1].prompts![1].id = "prompt-2";
  invalid.documents[1].prompts![1].projectIds = ["foreign"];
  assert.equal(validateRelationships(invalid), false);
  assert.ok(!JSON.stringify(resumeAiEvidence(resume)).includes(resume.email));
});
test("contact exclusion preserves ordinary words that contain a short nickname", () => {
  const doc = structuredClone(documents[0]);
  doc.resume!.name = "나";
  doc.resume!.summary = "나눠서 진행했습니다.";
  doc.text = formatResume(doc.resume!);
  const text = aiDocumentText(doc);
  assert.ok(text.includes("나눠서 진행했습니다."));
  assert.ok(!text.includes(doc.resume!.email));
});
test("AI receives only the chosen question or selected evidence and excludes resume contacts/private project data", () => {
  const cover = aiContext(s, "cover", "cover-test", undefined, undefined, {
    promptId: "prompt-2",
  }).data;
  assert.ok(cover.document && "question" in cover.document);
  assert.equal(cover.document.question, prompts[1].question);
  assert.equal(cover.document.limit, 10);
  assert.equal(cover.document.text, prompts[1].answer);
  assert.deepEqual(cover.projects, []);
  const resumeContext = JSON.stringify(
    aiContext(s, "resume", "resume-test").data,
  );
  for (const value of [resume.name, resume.email, resume.phone])
    assert.ok(!resumeContext.includes(value));
  assert.ok(
    !JSON.stringify(aiContext(s, "questions").data).includes(resume.email),
  );
  const reflection = aiContext(
    s,
    "reflection",
    undefined,
    undefined,
    undefined,
    { projectIds: [s.projects[0].id] },
  ).data;
  assert.equal(reflection.projects.length, 1);
  assert.equal(reflection.projects[0].id, s.projects[0].id);
  assert.ok(!JSON.stringify(reflection).includes("privateNote"));
  const source = experienceSignature(s.projects, [s.projects[0].id]);
  const edited = structuredClone(s.projects);
  edited[0].action = "실제 행동이 바뀌었습니다.";
  assert.notEqual(source, experienceSignature(edited, [s.projects[0].id]));
});
const dir = mkdtempSync(join(tmpdir(), "ieum-document-"));
process.env.CAREERMAP_DATA_DIR = dir;
process.env.CAREERMAP_DATABASE_PROVIDER = "sqlite";
process.env.CAREERMAP_AI_PROVIDER = "groq";
process.env.GROQ_API_KEY = "test-only";
delete process.env.VERCEL;
delete process.env.IEUM_ADMIN_EMAIL;
delete process.env.IEUM_ADMIN_USER_ID;
const store = await import("../lib/store");
const { query } = await import("../lib/database");
const workspace = await import("../app/api/workspace/route");
const ai = await import("../app/api/ai/route");
let token: string, userId: string;
const originalFetch = globalThis.fetch;
let calls: Record<string, any>[] = [];
before(async () => {
  const guest = await store.guestUser();
  token = guest.token;
  userId = guest.user.id;
  await store.saveWorkspace(userId, s, 0);
  globalThis.fetch = async (url, init) => {
    assert.equal(
      String(url),
      "https://api.groq.com/openai/v1/chat/completions",
    );
    calls.push(JSON.parse(String(init?.body)));
    return Response.json({
      choices: [
        {
          message: { content: "실제 경험에 근거한 제안" },
          finish_reason: "stop",
        },
      ],
    });
  };
});
after(async () => {
  globalThis.fetch = originalFetch;
  await store.closeDatabase();
  rmSync(dir, { recursive: true, force: true });
});
const request = (url: string, body: unknown) =>
  new NextRequest("http://ieum.test" + url, {
    method: url === "/api/workspace" ? "PUT" : "POST",
    headers: {
      host: "ieum.test",
      origin: "http://ieum.test",
      cookie: "careermap_session=" + token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
test("API prevents blank/foreign prompts, incomplete assessments and foreign evidence before charging AI quota", async () => {
  for (const body of [
    { task: "cover", targetId: "cover-test" },
    { task: "cover", targetId: "cover-test", promptId: "foreign" },
    { task: "reflection", projectIds: ["foreign"] },
  ])
    assert.equal((await ai.POST(request("/api/ai", body))).status, 400);
  const partial = structuredClone(s);
  delete partial.reflection!.answers.c1;
  assert.ok(await store.saveWorkspace(userId, partial, 1));
  assert.equal(
    (await ai.POST(request("/api/ai", { task: "reflection", projectIds: [] })))
      .status,
    400,
  );
  assert.equal(calls.length, 0);
  assert.equal(
    (
      await query<{ n: number }>(
        "SELECT count(*) AS n FROM ai_usage WHERE user_id=?",
        [userId],
      )
    ).rows[0].n,
    0,
  );
  assert.ok(await store.saveWorkspace(userId, s, 2));
  const result = await ai.POST(
    request("/api/ai", {
      task: "cover",
      targetId: "cover-test",
      promptId: "prompt-2",
    }),
  );
  assert.equal(result.status, 200);
  assert.equal(
    JSON.parse(calls[0].messages[1].content).document.question,
    prompts[1].question,
  );
  assert.equal(
    (
      await ai.POST(
        request("/api/ai", {
          task: "reflection",
          projectIds: [s.projects[0].id],
        }),
      )
    ).status,
    200,
  );
  const sent = JSON.parse(calls[1].messages[1].content);
  assert.equal(sent.reflection.length, 22);
  assert.equal(sent.projects.length, 1);
  assert.ok(calls[1].messages[0].content.includes("역량 어필 전략"));
  assert.equal(calls[1].max_completion_tokens, 3400);
  assert.deepEqual(
    JSON.parse((await store.findSession(token))!.state).documents[1].prompts,
    prompts,
  );
});
test("submission checks every question limit and freezes completed structured document text", async () => {
  const state = structuredClone(s);
  state.documents[1].prompts![1].answer = "가".repeat(11);
  state.documents[1].text = formatCover(state.documents[1].prompts!);
  state.documents[1].submitted = {
    text: state.documents[1].text,
    date: new Date().toISOString(),
    projectSnapshots: [state.projects[0]],
    jobSnapshot: state.jobs[0],
  };
  assert.equal(
    (await workspace.PUT(request("/api/workspace", { state, revision: 3 })))
      .status,
    400,
  );
  state.documents[1].prompts![1].answer = "정상 답변";
  state.documents[1].text = formatCover(state.documents[1].prompts!);
  state.documents[1].submitted!.text = state.documents[1].text;
  assert.equal(
    (await workspace.PUT(request("/api/workspace", { state, revision: 3 })))
      .status,
    200,
  );
  state.documents[1].submitted!.text = "바꾼 제출본";
  assert.equal(
    (await workspace.PUT(request("/api/workspace", { state, revision: 4 })))
      .status,
    400,
  );
  await store.closeDatabase();
  assert.equal(
    JSON.parse((await store.findSession(token))!.state).documents[0].resume
      .email,
    resume.email,
  );
});
