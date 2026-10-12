import { NextRequest } from "next/server";
import { authenticated, error, sameOrigin, sessionResponse } from "@/lib/http";
import { checkAiLimit } from "@/lib/store";
import { projectInputSchema } from "@/lib/project-draft";
import { generateProjectDraft } from "@/lib/project-ai";
import { answeredCount } from "@/lib/reflection";
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
    if (b.task === "project") {
      const parsed = projectInputSchema.safeParse(b.projectInput);
      if (!parsed.success)
        return error(
          "경험 설명을 짧게 입력해 주세요. 각 답변은 2,000자, 보완 답변은 4,000자 이내로 작성할 수 있습니다.",
        );
      if (!(await checkAiLimit(u.id)))
        return error("요청이 많습니다. 잠시 쉬었다가 다시 시도해 주세요.", 429);
      return sessionResponse(
        await generateProjectDraft(s.profile, parsed.data),
      );
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
      ["self", "resume", "cover", "match"].includes(b.task) &&
      !s.projects.length
    )
      return error("실제 경험을 먼저 정리해 주세요.");
    if (
      b.task === "reflection" &&
      answeredCount(s.reflection?.answers || {}) < 4
    )
      return error("질문에 4개 이상 답한 뒤 AI 정리를 시작해 주세요.");
    if (
      b.task === "feedback" &&
      (!(b.answer || "").trim() || !(b.question || "").trim())
    )
      return error("질문과 답변을 먼저 입력해 주세요.");
    if (!(await checkAiLimit(u.id)))
      return error("요청이 많습니다. 잠시 쉬었다가 다시 시도해 주세요.", 429);
    return sessionResponse(
      await generate(
        b.task as AiTask,
        aiContext(s, b.task, b.targetId, b.answer, b.question),
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
