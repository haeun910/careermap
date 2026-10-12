import { NextRequest } from "next/server";
import { authenticated, sameOrigin, error, sessionResponse } from "@/lib/http";
import { getEvidence, deleteEvidence, evidenceFailure } from "@/lib/evidence";
export const runtime = "nodejs";
type Context = { params: Promise<{ projectId: string; id: string }> };
export async function GET(req: NextRequest, ctx: Context) {
  try {
    const user = await authenticated(req);
    if (!user) return error("로그인하거나 내 공간을 다시 열어 주세요.", 401);
    const { projectId, id } = await ctx.params;
    const file = await getEvidence(user.id, projectId, id);
    const preview =
      req.nextUrl.searchParams.get("preview") === "1" &&
      file.mime.startsWith("image/");
    const filename = encodeURIComponent(file.name).replace(
      /['()*]/g,
      (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase(),
    );
    return new Response(Buffer.from(file.content, "base64"), {
      headers: {
        "Content-Type": file.mime,
        "Content-Length": String(file.size),
        "Content-Disposition": `${preview ? "inline" : "attachment"}; filename="evidence.${file.name.split(".").at(-1)}"; filename*=UTF-8''${filename}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "sandbox; default-src 'none'",
        "Cross-Origin-Resource-Policy": "same-origin",
        "Referrer-Policy": "no-referrer",
      },
    });
  } catch (cause) {
    return evidenceFailure(cause);
  }
}
export async function DELETE(req: NextRequest, ctx: Context) {
  if (!sameOrigin(req)) return error("잘못된 요청 출처입니다.", 403);
  try {
    const user = await authenticated(req);
    if (!user) return error("로그인하거나 내 공간을 다시 열어 주세요.", 401);
    const { projectId, id } = await ctx.params;
    await deleteEvidence(user.id, projectId, id);
    return sessionResponse({ ok: true });
  } catch (cause) {
    return evidenceFailure(cause);
  }
}
