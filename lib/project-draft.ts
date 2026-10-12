import { z } from "zod";
import type { Project, Workspace } from "./types";

export const experienceCategories = [
  "프로젝트",
  "UX/UI 디자인",
  "서비스 기획",
  "사이드 프로젝트",
  "연구 · 실험",
  "업무 경험",
  "대외활동",
  "학업 · 동아리",
] as const;
export const draftFields = [
  "title",
  "role",
  "problem",
  "action",
  "result",
  "learning",
] as const;
export type DraftField = (typeof draftFields)[number];
export const draftLabels: Record<DraftField, string> = {
  title: "경험 이름",
  role: "내 역할",
  problem: "배경 · 목표",
  action: "실행 과정",
  result: "결과 · 성과",
  learning: "배운 점",
};
export const sourceLabels = {
  about: "경험 설명",
  contribution: "내가 한 일",
  outcome: "결과 · 배운 점",
  additional: "보완 답변",
};
const sourceId = z.enum(["about", "contribution", "outcome", "additional"]);
export const projectInputSchema = z
  .object({
    category: z.enum(experienceCategories),
    about: z.string().trim().min(1).max(2000),
    contribution: z.string().trim().max(2000),
    outcome: z.string().trim().max(2000),
    additional: z.string().trim().max(4000),
  })
  .strict();
export type ProjectInput = z.infer<typeof projectInputSchema>;
export const projectDraftSchema = z
  .object({
    draft: z
      .object({
        title: z.string().trim().min(1).max(200),
        role: z.string().max(200),
        problem: z.string().max(3000),
        action: z.string().max(3000),
        result: z.string().max(3000),
        learning: z.string().max(3000),
        tags: z.array(z.string().trim().min(1).max(200)).max(12),
      })
      .strict(),
    sources: z
      .object({
        title: z.array(sourceId).max(4),
        role: z.array(sourceId).max(4),
        problem: z.array(sourceId).max(4),
        action: z.array(sourceId).max(4),
        result: z.array(sourceId).max(4),
        learning: z.array(sourceId).max(4),
      })
      .strict(),
    questions: z
      .array(
        z
          .object({
            field: z.enum(draftFields),
            question: z.string().trim().min(1).max(200),
          })
          .strict(),
      )
      .max(3),
  })
  .strict();
export type ProjectDraft = z.infer<typeof projectDraftSchema>;
export function parseProjectDraft(
  text: string,
  input: ProjectInput,
): ProjectDraft {
  const content = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  let result: ProjectDraft;
  try {
    result = projectDraftSchema.parse(JSON.parse(content));
  } catch {
    throw new Error(
      "AI 초안 형식을 확인하지 못했습니다. 입력은 유지됩니다. 다시 시도해 주세요.",
    );
  }
  for (const field of draftFields) {
    const text = result.draft[field].trim();
    const sources = result.sources[field];
    if (sources.some((id) => !input[id].trim()) || (text && !sources.length)) {
      throw new Error(
        "AI 초안의 답변 근거를 확인하지 못했습니다. 입력은 유지됩니다. 다시 시도해 주세요.",
      );
    }
    // A model must not introduce a performance figure absent from its cited answers.
    const evidence = sources.map((id) => input[id]).join(" ");
    const numbers = (value: string): string[] =>
      value.match(/\d+(?:[.,]\d+)*/g) || [];
    if (numbers(text).some((n) => !numbers(evidence).includes(n))) {
      throw new Error(
        "입력에 없는 수치가 포함되어 초안을 적용하지 않았습니다. 다시 시도해 주세요.",
      );
    }
    result.draft[field] = text;
  }
  const evidence = [
    input.about,
    input.contribution,
    input.outcome,
    input.additional,
  ]
    .join(" ")
    .toLocaleLowerCase();
  result.draft.tags = [...new Set(result.draft.tags)].filter((tag) =>
    evidence.includes(tag.toLocaleLowerCase()),
  );
  return result;
}
export function projectDraftContext(
  profile: Workspace["profile"],
  input: ProjectInput,
) {
  return {
    profile: {
      type: profile.type,
      background: profile.background,
      role: profile.role,
    },
    experience: input,
  };
}
export function applyProjectDraft(
  project: Project,
  result: ProjectDraft,
  selected: DraftField[],
  includeTags: boolean,
): Project {
  const next = {
    ...project,
    tags: includeTags ? [...result.draft.tags] : [...project.tags],
  };
  for (const field of selected) next[field] = result.draft[field];
  return next;
}
