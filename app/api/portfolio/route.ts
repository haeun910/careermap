import { NextRequest } from "next/server";
import { authenticated, error, sameOrigin, sessionResponse } from "@/lib/http";
import { unpublish, publish } from "@/lib/store";
import { portfolioSnapshot } from "@/lib/portfolio";
import type { Workspace } from "@/lib/types";
export const runtime = "nodejs";
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return error("잘못된 요청 출처입니다.", 403);
  try {
    const u = await authenticated(req);
    if (!u) return error("로그인이 필요합니다.", 401);
    if (!u.email)
      return error("사이트를 공개하려면 먼저 계정을 만들어 주세요.", 401);
    const state = JSON.parse(u.state) as Workspace;
    if (!state.portfolio.projectIds.length)
      return error("공개할 프로젝트를 선택해 주세요.");
    return sessionResponse({
      slug: await publish(u.id, portfolioSnapshot(state)),
      updatedAt: new Date().toISOString(),
    });
  } catch {
    return error("게시하지 못했습니다. 잠시 후 다시 시도해 주세요.", 503);
  }
}
export async function DELETE(req: NextRequest) {
  if (!sameOrigin(req)) return error("잘못된 요청 출처입니다.", 403);
  try {
    const u = await authenticated(req);
    if (!u) return error("로그인이 필요합니다.", 401);
    await unpublish(u.id);
    return sessionResponse({ ok: true });
  } catch {
    return error("공개 해제하지 못했습니다. 잠시 후 다시 시도해 주세요.", 503);
  }
}
