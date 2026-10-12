import { NextRequest } from "next/server";
import { authenticated, error, sameOrigin, sessionResponse } from "@/lib/http";
import { checkAiLimit } from "@/lib/store";
import { projectInputSchema } from "@/lib/project-draft";
import { generateProjectDraft } from "@/lib/project-ai";
import { allReflectionQuestions, answeredCount } from "@/lib/reflection";
import { aiContext, generate } from "@/lib/ai";
import type { AiTask, Workspace } from "@/lib/types";
export const runtime = "nodejs";
export const maxDuration = 60;
const tasks = [
  "project",
  "self",
  "reflection",
  "company",
  "match",
  "resume",
  "cover",
  "questions",
  "feedback",
];
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return error("잘못된 요청 출처입니다.", 403);
  try {
    const u = await authenticated(req);
    if (!u) return error("작업 공간을 다시 열어 주세요.", 401);
    const raw = await req.text();
    if (raw.length > 20000)
      return error("입력이 너무 큽니다. 답변을 간략히 정리해 주세요.", 413);
    let b;
    try {
      b = JSON.parse(raw);
    } catch {
      return error("입력 형식을 확인해 주세요.");
    }
    if (!b || typeof b !== "object" || Array.isArray(b))
      return error("입력 형식을 확인해 주세요.");
    if (
      !tasks.includes(b.task) ||
      typeof (b.targetId || "") !== "string" ||
      typeof (b.answer || "") !== "string" ||
      (b.answer || "").length > 8000 ||
      typeof (b.question || "") !== "string" ||
      (b.question || "").length > 2000
    )
      return error("입력 형식을 확인해 주세요.");
    const s = JSON.parse(u.state) as Workspace;
    const doc = s.documents.find((d) => d.id === b.targetId);
    if (
      b.promptId !== undefined &&
      (typeof b.promptId !== "string" || b.promptId.length > 100)
    )
      return error("문항을 확인해 주세요.");
    if (b.task === "resume" && doc?.kind === "자기소개서")
      return error("이력서 또는 경력기술서를 선택해 주세요.");
    if (b.task === "cover") {
      if (!doc || doc.kind !== "자기소개서")
        return error("자기소개서 문서를 먼저 만들어 주세요.");
      const prompt = doc.prompts?.find((p) => p.id === b.promptId);
      if (doc.prompts && !prompt)
        return error("답변할 문항을 먼저 선택해 주세요.");
      if (!(prompt?.question ?? doc.question).trim())
        return error("자기소개서 문항을 먼저 입력해 주세요.");
      if (prompt && !prompt.projectIds.length && !prompt.notes.trim())
        return error(
          "이 문항에 활용할 실제 경험이나 핵심 내용을 먼저 입력해 주세요.",
        );
    }
    if (
      b.task === "reflection" &&
      b.projectIds !== undefined &&
      (!Array.isArray(b.projectIds) ||
        b.projectIds.length > 3 ||
        b.projectIds.some(
          (id: unknown) =>
            typeof id !== "string" || !s.projects.some((p) => p.id === id),
        ))
    )
      return error(
        "분석할 경험은 내 기록에서 최대 3개까지 선택할 수 있습니다.",
      );
    if (b.task === "project") {
      const parsed = projectInputSchema.safeParse(b.projectInput);
      if (!parsed.success)
        return error(
          "경험 설명을 짧게 입력해 주세요. 각 답변은 2,000자, 보완 답변은 4,000자 이내로 작성할 수 있습니다.",
        );
      if (!(await checkAiLimit(u.id)))
        return error("요청이 많습니다. 잠시 쉬었다가 다시 시도해 주세요.", 429);
      return sessionResponse(await generateProjectDraft(parsed.data));
    }
    if (
      (["company", "match"].includes(b.task) ||
        (["questions", "feedback"].includes(b.task) && b.targetId)) &&
      !s.jobs.some((j) => j.id === b.targetId)
    )
      return error("공고를 먼저 선택해 주세요.");
    if (
      ["resume", "cover"].includes(b.task) &&
      !s.documents.some((d) => d.id === b.targetId)
    )
      return error("문서를 먼저 만들어 주세요.");
    if (
      (["self", "match"].includes(b.task) ||
        (["resume", "cover"].includes(b.task) &&
          !doc?.resume &&
          !doc?.prompts)) &&
      !s.projects.length
    )
      return error("실제 경험을 먼저 정리해 주세요.");
    if (
      b.task === "reflection" &&
      answeredCount(s.reflection?.answers || {}) < allReflectionQuestions.length
    )
      return error("22문항을 모두 답한 뒤 역량 어필 전략을 준비해 주세요.");
    if (
      b.task === "feedback" &&
      (!(b.answer || "").trim() || !(b.question || "").trim())
    )
      return error("질문과 답변을 먼저 입력해 주세요.");
    if (
      b.task === "resume" &&
      doc?.resume &&
      ![
        ...doc.resume.education,
        ...doc.resume.career,
        ...doc.resume.experiences,
        ...doc.resume.credentials,
      ].some((e) => e.title.trim())
    )
      return error("소개에 활용할 학력·경력·경험 항목을 먼저 채워 주세요.");
    if (!(await checkAiLimit(u.id)))
      return error("요청이 많습니다. 잠시 쉬었다가 다시 시도해 주세요.", 429);
    return sessionResponse(
      await generate(
        b.task as AiTask,
        aiContext(s, b.task, b.targetId, b.answer, b.question, {
          promptId: b.promptId,
          projectIds: b.projectIds,
        }),
      ),
    );
  } catch (e) {
    return error(
      e instanceof Error && e.name === "TimeoutError"
        ? "AI 응답이 지연되었습니다. 입력은 유지됩니다. 다시 시도해 주세요."
        : e instanceof Error
          ? e.message
          : "AI 요청에 실패했습니다.",
      502,
    );
  }
}
