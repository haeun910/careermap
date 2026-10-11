import { z } from "zod";
import type { Workspace } from "./types";
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
            jobId: id,
            kind: z.enum(["이력서", "자기소개서", "경력기술서"]),
            title: short,
            question: text,
            limit: z.number().int().min(0).max(10000),
            text,
            projectIds: ids,
            versions: z
              .array(z.object({ id, text, date: short }).strict())
              .max(30),
            submitted: z
              .object({
                text,
                date: short,
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
            jobId: id,
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
            jobId: id,
            date: short,
            question: text,
            answer: text,
            feedback: text,
          })
          .strict(),
      )
      .max(100),
    selfAnalysis: text,
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
      (x) => j.has(x.jobId) && x.projectIds.every((i) => p.has(i)),
    ) &&
    s.tasks.every((x) => !x.jobId || j.has(x.jobId)) &&
    s.questions.every((x) => j.has(x.jobId)) &&
    s.practices.every((x) => j.has(x.jobId)) &&
    s.portfolio.projectIds.every((i) => p.has(i))
  );
}
