import { NextRequest } from "next/server";
import { authenticated, error, sameOrigin, sessionResponse } from "@/lib/http";
import { isAdministrator } from "@/lib/admin";
import {
  announcementInput,
  listAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} from "@/lib/announcements";
export const runtime = "nodejs";
export async function GET(req: NextRequest) {
  try {
    if (!(await isAdministrator(await authenticated(req))))
      return error("관리자 전용 기능입니다.", 403);
    return sessionResponse({ announcements: await listAnnouncements(true) });
  } catch {
    return error("관리자 자료를 불러오지 못했습니다.", 503);
  }
}
async function modify(
  req: NextRequest,
  action: "create" | "update" | "delete",
) {
  if (!sameOrigin(req)) return error("잘못된 요청 출처입니다.", 403);
  try {
    if (!(await isAdministrator(await authenticated(req))))
      return error("관리자 전용 기능입니다.", 403);
    const raw = await req.text();
    if (raw.length > 30000) return error("공지 내용이 너무 큽니다.", 413);
    let body;
    try {
      body = JSON.parse(raw);
    } catch {
      return error("입력 형식을 확인해 주세요.");
    }
    if (!body || typeof body !== "object")
      return error("입력 형식을 확인해 주세요.");
    if (
      action !== "create" &&
      (typeof body.id !== "string" ||
        !body.id ||
        body.id.length > 100 ||
        !Number.isInteger(body.revision) ||
        body.revision < 0)
    )
      return error("공지와 수정 버전을 확인해 주세요.");
    if (action === "delete") {
      if (!(await deleteAnnouncement(body.id, body.revision)))
        return error(
          "공지가 변경됐습니다. 목록을 새로 불러온 뒤 확인해 주세요.",
          409,
        );
      return sessionResponse({ ok: true });
    }
    const parsed = announcementInput.safeParse(body.announcement);
    if (!parsed.success)
      return error(
        "제목은 160자, 본문은 10,000자 이내로 작성해 주세요. 게시할 공지에는 본문이 필요합니다.",
      );
    if (action === "create")
      return sessionResponse({
        announcement: await createAnnouncement(parsed.data),
      });
    const updated = await updateAnnouncement(
      body.id,
      body.revision,
      parsed.data,
    );
    if (!updated)
      return error(
        "공지가 변경됐습니다. 목록을 새로 불러온 뒤 확인해 주세요.",
        409,
      );
    return sessionResponse({ announcement: updated });
  } catch {
    return error("공지를 저장하지 못했습니다. 다시 시도해 주세요.", 503);
  }
}
export const POST = (req: NextRequest) => modify(req, "create");
export const PATCH = (req: NextRequest) => modify(req, "update");
export const DELETE = (req: NextRequest) => modify(req, "delete");
