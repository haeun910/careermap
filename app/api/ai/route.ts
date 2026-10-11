import { NextRequest } from "next/server";
import { authenticated, error, sameOrigin, sessionResponse } from "@/lib/http";
import { checkAiLimit } from "@/lib/store";
import { aiContext, generate } from "@/lib/ai";
import type { AiTask, Workspace } from "@/lib/types";
export const runtime = "nodejs";
export const maxDuration = 60;
const tasks = [
  "self",
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
    const b = await req.json();
    if (
      !tasks.includes(b.task) ||
      typeof (b.targetId || "") !== "string" ||
      typeof (b.answer || "") !== "string" ||
      (b.answer || "").length > 8000 ||
      typeof (b.question || "") !== "string" ||
      (b.question || "").length > 2000
    )
      return error("입력 형식을 확인해 주세요.");
    if (!(await checkAiLimit(u.id)))
      return error("요청이 많습니다. 잠시 쉬었다가 다시 시도해 주세요.", 429);
    const s = JSON.parse(u.state) as Workspace;
    if (
      ["company", "match", "questions", "feedback"].includes(b.task) &&
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
