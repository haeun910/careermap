import { NextRequest } from "next/server";
import { authenticated, sameOrigin, error, sessionResponse } from "@/lib/http";
import {
  addEvidence,
  listEvidence,
  EvidenceError,
  evidenceFailure,
} from "@/lib/evidence";
import { EVIDENCE_FILE_LIMIT } from "@/lib/evidence-limits";
export const runtime = "nodejs";
type Context = { params: Promise<{ projectId: string }> };
export async function GET(req: NextRequest, ctx: Context) {
  try {
    const user = await authenticated(req);
    if (!user) return error("로그인하거나 내 공간을 다시 열어 주세요.", 401);
    return sessionResponse(
      await listEvidence(user.id, (await ctx.params).projectId),
    );
  } catch (cause) {
    return evidenceFailure(cause);
  }
}
export async function POST(req: NextRequest, ctx: Context) {
  if (!sameOrigin(req)) return error("잘못된 요청 출처입니다.", 403);
  try {
    const user = await authenticated(req);
    if (!user) return error("로그인하거나 내 공간을 다시 열어 주세요.", 401);
    if (!req.headers.get("content-type")?.startsWith("multipart/form-data;"))
      throw new EvidenceError("첨부할 파일을 선택해 주세요.");
    const max = EVIDENCE_FILE_LIMIT + 65536;
    if (Number(req.headers.get("content-length") || 0) > max)
      throw new EvidenceError(
        "파일은 한 개당 2 MB까지 첨부할 수 있습니다.",
        413,
      );
    const reader = req.body?.getReader();
    if (!reader) throw new EvidenceError("첨부할 파일을 선택해 주세요.");
    const chunks: Uint8Array[] = [];
    let length = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        length += value.length;
        if (length > max) {
          await reader.cancel();
          throw new EvidenceError(
            "파일은 한 개당 2 MB까지 첨부할 수 있습니다.",
            413,
          );
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    let form: FormData;
    try {
      form = await new Response(Buffer.concat(chunks), {
        headers: { "Content-Type": req.headers.get("content-type")! },
      }).formData();
    } catch {
      throw new EvidenceError("첨부 형식을 확인해 주세요.");
    }
    const files = form.getAll("file");
    if (files.length !== 1 || !(files[0] instanceof File))
      throw new EvidenceError("파일을 한 개씩 첨부해 주세요.");
    return sessionResponse({
      file: await addEvidence(user.id, (await ctx.params).projectId, files[0]),
    });
  } catch (cause) {
    return evidenceFailure(cause);
  }
}
