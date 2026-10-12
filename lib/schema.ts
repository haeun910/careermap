import { z } from "zod";
import type { Workspace } from "./types";
import { validReflectionAnswer, situationQuestions } from "./reflection";
const text = z.string().max(16000),
  short = z.string().max(200),
  id = z.string().min(1).max(100),
  ids = z.array(id).max(100);
const url = z
  .string()
  .max(2000)
  .refine(
    (s) => !s || /^https?:\/\//i.test(s),
    "http(s) 주소를 입력해 주세요.",
  );
const project = z
  .object({
    id,
    title: short.min(1),
    category: short,
    period: short,
    role: short,
    problem: text,
    action: text,
    result: text,
    learning: text,
    tags: z.array(short).max(30),
    link: url,
    privateNote: text,
  })
  .strict();
const job = z
  .object({
    id,
    companyId: id,
    title: short.min(1),
    deadline: short,
    status: z.enum(["관심", "준비 중", "지원 완료", "면접 진행", "결과 확정"]),
    description: text,
    source: url,
    projectIds: ids,
    analysis: text,
    analyzedAt: short,
    matchAnalysis: text.optional(),
  })
  .strict();
const reflectionAnswers = z
  .record(z.string().max(100), z.union([z.number().int(), z.string().max(100)]))
  .refine(
    (a) =>
      Object.entries(a).every(([id, value]) =>
        validReflectionAnswer(id, value),
      ),
    "질문과 답변을 확인해 주세요.",
  );
const reflectionNotes = z
  .record(z.string().max(100), z.string().max(600))
  .refine(
    (n) =>
      Object.keys(n).every((id) => situationQuestions.some((q) => q.id === id)),
    "상황 질문을 확인해 주세요.",
  );
const resumeEntry = z
  .object({
    id,
    projectId: id.optional(),
    title: short,
    detail: short,
    period: short,
    description: z.string().max(4000),
  })
  .strict();
const resume = z
  .object({
    name: short,
    email: z.string().max(320),
    phone: short,
    headline: short,
    summary: z.string().max(2000),
    skills: z.string().max(2000),
    portfolio: url,
    education: z.array(resumeEntry).max(10),
    career: z.array(resumeEntry).max(15),
    experiences: z.array(resumeEntry).max(15),
    credentials: z.array(resumeEntry).max(15),
  })
  .strict();
const coverPrompt = z
  .object({
    id,
    question: z.string().max(2000),
    limit: z.number().int().min(0).max(10000),
    notes: z.string().max(4000),
    answer: text,
    projectIds: ids,
  })
  .strict();
const reflection = z
  .object({
    version: z.literal(1),
    answers: reflectionAnswers,
    notes: reflectionNotes,
    updatedAt: short,
    history: z
      .array(
        z
          .object({
            id,
            date: short,
            answers: reflectionAnswers,
            notes: reflectionNotes,
          })
          .strict(),
      )
      .max(10),
    analysis: z
      .object({
        text,
        source: z.string().max(10000),
        date: short,
        projectIds: ids.optional(),
        experienceSource: short.optional(),
      })
      .strict()
      .optional(),
  })
  .strict();
export const workspaceSchema = z
  .object({
    profile: z
      .object({
        name: short.min(1),
        type: short,
        background: short,
        role: short,
        bio: text,
      })
      .strict(),
    projects: z.array(project).max(100),
    companies: z
      .array(
        z
          .object({
            id,
            name: short.min(1),
            industry: short,
            color: z.string().regex(/^#[a-fA-F0-9]{6}$/),
            overview: text,
            website: url,
            priority: short,
          })
          .strict(),
      )
      .max(100),
    jobs: z.array(job).max(200),
    documents: z
      .array(
        z
          .object({
            id,
            jobId: z.union([id, z.literal("")]),
            kind: z.enum(["이력서", "자기소개서", "경력기술서"]),
            title: short,
            question: text,
            limit: z.number().int().min(0).max(10000),
            text,
            projectIds: ids,
            resume: resume.optional(),
            prompts: z.array(coverPrompt).max(10).optional(),
            versions: z
              .array(z.object({ id, text, date: short }).strict())
              .max(30),
            submitted: z
              .object({
                text,
                date: short,
                resume: resume.optional(),
                projectSnapshots: z.array(project).max(100),
                jobSnapshot: job,
              })
              .strict()
              .optional(),
          })
          .strict(),
      )
      .max(300),
    tasks: z
      .array(
        z
          .object({
            id,
            text: short.min(1),
            done: z.boolean(),
            category: short,
            jobId: short,
            deadline: short,
          })
          .strict(),
      )
      .max(300),
    questions: z
      .array(
        z
          .object({
            id,
            jobId: z.union([id, z.literal("")]),
            question: text,
            answer: text,
            sourceDocumentId: short,
          })
          .strict(),
      )
      .max(300),
    practices: z
      .array(
        z
          .object({
            id,
            jobId: z.union([id, z.literal("")]),
            date: short,
            question: text,
            answer: text,
            feedback: text,
          })
          .strict(),
      )
      .max(100),
    selfAnalysis: text,
    reflection: reflection.optional(),
    portfolio: z
      .object({
        title: short,
        subtitle: short,
        about: text,
        projectIds: ids,
        email: z.string().max(200),
        showEmail: z.boolean(),
        projectOverrides: z.record(
          z.string(),
          z.object({ title: short, result: text }).strict(),
        ),
      })
      .strict(),
  })
  .strict();
export function validateRelationships(s: Workspace) {
  const p = new Set(s.projects.map((x) => x.id)),
    c = new Set(s.companies.map((x) => x.id)),
    j = new Set(s.jobs.map((x) => x.id));
  const arrays = [
    s.projects,
    s.companies,
    s.jobs,
    s.documents,
    s.tasks,
    s.questions,
    s.practices,
  ];
  if (arrays.some((a) => new Set(a.map((x) => x.id)).size !== a.length))
    return false;
  return (
    s.jobs.every(
      (x) => c.has(x.companyId) && x.projectIds.every((i) => p.has(i)),
    ) &&
    s.documents.every(
      (x) =>
        (!x.jobId || j.has(x.jobId)) &&
        (!x.submitted || Boolean(x.jobId)) &&
        x.projectIds.every((i) => p.has(i)) &&
        (!x.prompts ||
          (x.kind === "자기소개서" &&
            new Set(x.prompts.map((q) => q.id)).size === x.prompts.length &&
            x.prompts.every((q) => q.projectIds.every((i) => p.has(i))))) &&
        (!x.resume ||
          (x.kind !== "자기소개서" &&
            x.resume.experiences.every(
              (e) => !e.projectId || p.has(e.projectId),
            ))),
    ) &&
    s.tasks.every((x) => !x.jobId || j.has(x.jobId)) &&
    s.questions.every(
      (x) =>
        (!x.jobId || j.has(x.jobId)) &&
        (!x.sourceDocumentId ||
          s.documents.some(
            (d) => d.id === x.sourceDocumentId && d.jobId === x.jobId,
          )),
    ) &&
    s.practices.every((x) => !x.jobId || j.has(x.jobId)) &&
    s.portfolio.projectIds.every((i) => p.has(i))
  );
}
