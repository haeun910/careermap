import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyWorkspace, sampleWorkspace } from "../lib/seed";
import {
  emptyReflection,
  reflectionResults,
  allReflectionQuestions,
  answeredCount,
  reflectionSignature,
} from "../lib/reflection";
import { workspaceSchema, validateRelationships } from "../lib/schema";
import { aiContext } from "../lib/ai";
import { portfolioSnapshot } from "../lib/portfolio";
import { copyDocumentToSpace, copyQuestionToSpace } from "../lib/master";
import type { Document } from "../lib/types";

test("older workspaces stay valid; partial answers are not scored as neutral", () => {
  assert.ok(workspaceSchema.safeParse(sampleWorkspace()).success);
  const r = emptyReflection();
  r.answers.c1 = 5;
  const partial = reflectionResults(r).find((x) => x.id === "autonomy")!;
  assert.equal(partial.complete, false);
  assert.equal(partial.mean, null);
  assert.equal(partial.answered, 1);
  r.answers.c2 = 5;
  const mixed = reflectionResults(r).find((x) => x.id === "autonomy")!;
  assert.equal(mixed.preference, "상황과 조건에 따라 달라짐");
  assert.equal(mixed.tension, true);
  r.answers.c2 = 1;
  assert.equal(
    reflectionResults(r).find((x) => x.id === "autonomy")!.preference,
    "방법을 정하는 자율성",
  );
});

test("question schema rejects invented items, out-of-range choices, and oversized notes", () => {
  const s = emptyWorkspace();
  s.reflection = emptyReflection();
  const invalidAnswers: Record<string, number | string>[] = [
    { c1: 6 },
    { c1: 0 },
    { c1: 2.5 },
    { s1: "z" },
    { unknown: 1 },
  ];
  for (const answers of invalidAnswers) {
    s.reflection.answers = answers;
    assert.equal(workspaceSchema.safeParse(s).success, false);
  }
  s.reflection.answers = { c1: 5, s1: "a" };
  s.reflection.notes = { s1: "이유" };
  assert.equal(workspaceSchema.safeParse(s).success, true);
  s.reflection.notes = { s1: "가".repeat(601) };
  assert.equal(workspaceSchema.safeParse(s).success, false);
});

test("question summaries and AI context expose only the selected reflection data", () => {
  const s = sampleWorkspace();
  s.reflection = emptyReflection();
  s.reflection.answers = { c1: 5, c2: 1, j1: 4, j2: 4, s1: "b" };
  s.reflection.notes = { s1: "작은 초안부터 확인" };
  s.projects[0].privateNote = "PRIVATE_PROJECT_NOTE";
  s.profile.name = "PRIVATE_NAME";
  const reflection = aiContext(s, "reflection").data;
  const json = JSON.stringify(reflection);
  assert.ok(json.includes("작은 초안부터 확인"));
  assert.ok(!json.includes("PRIVATE_PROJECT_NOTE"));
  assert.ok(!json.includes("PRIVATE_NAME"));
  assert.equal(reflection.projects.length, 0);
  assert.ok(
    !JSON.stringify(aiContext(s, "company", s.jobs[0].id)).includes(
      "작은 초안부터 확인",
    ),
  );
  assert.ok(
    !JSON.stringify(portfolioSnapshot(s)).includes("작은 초안부터 확인"),
  );
  const before = reflectionSignature(s.reflection);
  s.reflection.notes.s1 = "다른 이유";
  assert.notEqual(before, reflectionSignature(s.reflection));
});

test("master materials need no jobs, but submitted versions still require a job", () => {
  const s = emptyWorkspace();
  const doc: Document = {
    id: "master",
    jobId: "",
    kind: "이력서",
    title: "공통 이력서",
    question: "",
    limit: 0,
    text: "공통 경험",
    projectIds: [],
    versions: [],
  };
  s.documents = [doc];
  s.questions = [
    {
      id: "question",
      jobId: "",
      question: "자기소개",
      answer: "공통 답변",
      sourceDocumentId: "",
    },
  ];
  assert.ok(workspaceSchema.safeParse(s).success);
  assert.ok(validateRelationships(s));
  doc.jobId = "missing";
  assert.equal(validateRelationships(s), false);
  doc.jobId = "";
  doc.submitted = {
    text: "공통 경험",
    date: new Date().toISOString(),
    projectSnapshots: [],
    jobSnapshot: sampleWorkspace().jobs[0],
  };
  assert.equal(validateRelationships(s), false);
});

test("company copies have fresh identities, independent content, and no inherited submission", () => {
  const s = sampleWorkspace();
  const master: Document = {
    id: "master",
    jobId: "",
    kind: "자기소개서",
    title: "공통 자소서",
    question: "문제 해결",
    limit: 700,
    text: "공통 경험",
    projectIds: [s.projects[0].id],
    versions: [],
  };
  const copy = copyDocumentToSpace(s, master, s.jobs[0].id);
  assert.notEqual(copy.id, master.id);
  copy.text = "기업별 강조점";
  copy.projectIds.length = 0;
  assert.equal(master.text, "공통 경험");
  assert.equal(master.projectIds.length, 1);
  master.jobId = s.jobs[0].id;
  master.submitted = {
    text: "확정한 제출 내용",
    date: new Date().toISOString(),
    projectSnapshots: [],
    jobSnapshot: s.jobs[0],
  };
  const back = copyDocumentToSpace(s, master, "");
  assert.equal(back.text, "확정한 제출 내용");
  assert.equal(back.submitted, undefined);
  const question = {
    id: "q",
    jobId: s.jobs[0].id,
    question: "협업",
    answer: "원본 답변",
    sourceDocumentId: master.id,
  };
  const common = copyQuestionToSpace(s, question, "");
  common.answer = "공통 답변";
  assert.equal(question.answer, "원본 답변");
  assert.equal(common.sourceDocumentId, "");
  assert.throws(() => copyDocumentToSpace(s, master, "missing"));
});

test("complete snapshots preserve prior responses after current answers change", () => {
  const r = emptyReflection();
  for (const q of allReflectionQuestions)
    r.answers[q.id] = q.section === "situation" ? "a" : 4;
  assert.equal(answeredCount(r.answers), 22);
  r.history.push({
    id: "snapshot",
    date: new Date().toISOString(),
    answers: structuredClone(r.answers),
    notes: {},
  });
  r.answers.c1 = 1;
  assert.equal(r.history[0].answers.c1, 4);
  const s = emptyWorkspace();
  s.reflection = r;
  assert.ok(workspaceSchema.safeParse(s).success);
});
