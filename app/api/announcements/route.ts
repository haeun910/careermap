import { listAnnouncements } from "@/lib/announcements";
import { error, sessionResponse } from "@/lib/http";
export const runtime = "nodejs";
export async function GET() {
  try {
    return sessionResponse({ announcements: await listAnnouncements() });
  } catch {
    return error(
      "공지를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
      503,
    );
  }
}
