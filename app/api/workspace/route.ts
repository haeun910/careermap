import { NextRequest } from "next/server";
import { authenticated, error, sameOrigin, sessionResponse } from "@/lib/http";
import { guestUser, saveWorkspace, userResponse } from "@/lib/store";
import { workspaceSchema, validateRelationships } from "@/lib/schema";
import type { Workspace } from "@/lib/types";
export const runtime = "nodejs";
export async function GET(req: NextRequest) {
  try {
    const user = await authenticated(req);
    if (user) return sessionResponse(await userResponse(user));
    const guest = await guestUser();
    return sessionResponse(await userResponse(guest.user), guest.token);
  } catch {
    return error(
      "저장소에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      503,
    );
  }
}
export async function PUT(req: NextRequest) {
  if (!sameOrigin(req)) return error("잘못된 요청 출처입니다.", 403);
  try {
    const user = await authenticated(req);
    if (!user) return error("작업 공간을 다시 열어 주세요.", 401);
    if (Number(req.headers.get("content-length") || 0) > 1500000)
      return error("자료가 너무 큽니다.", 413);
    const body = await req.json();
    const parsed = workspaceSchema.safeParse(body.state);
    if (!parsed.success || !Number.isInteger(body.revision))
      return error("입력 형식을 확인해 주세요.");
    const state = parsed.data;
    if (!validateRelationships(state))
      return error("연결된 프로젝트나 공고를 확인해 주세요.");
    const old = JSON.parse(user.state) as Workspace;
    for (const doc of old.documents.filter((d) => d.submitted)) {
      const updated = state.documents.find((d) => d.id === doc.id);
      if (
        !updated ||
        updated.jobId !== doc.jobId ||
        updated.kind !== doc.kind ||
        JSON.stringify(doc.submitted) !== JSON.stringify(updated.submitted)
      )
        return error("제출본은 보존됩니다. 새 작업본을 만들어 주세요.");
    }
    if (!(await saveWorkspace(user.id, state, body.revision)))
      return error(
        "다른 화면에서 수정되었습니다. 새로고침 후 다시 시도해 주세요.",
        409,
      );
    return sessionResponse({ revision: body.revision + 1 });
  } catch {
    return error("저장하지 못했습니다. 입력을 확인해 주세요.");
  }
}
