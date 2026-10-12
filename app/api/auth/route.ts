import { NextRequest } from "next/server";
import { reservedAdministratorEmail } from "@/lib/admin";
import {
  authenticated,
  error,
  sameOrigin,
  sessionCookie,
  sessionResponse,
} from "@/lib/http";
import {
  guestUser,
  login,
  makeSession,
  register,
  revokeSession,
  userResponse,
  emailExists,
} from "@/lib/store";
export const runtime = "nodejs";
const attempts = new Map<string, { count: number; start: number }>();
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return error("잘못된 요청 출처입니다.", 403);
  const addr = req.headers.get("x-forwarded-for") || "local";
  const a = attempts.get(addr);
  if (a && Date.now() - a.start < 600000 && a.count >= 15)
    return error("잠시 후 다시 시도해 주세요.", 429);
  attempts.set(addr, {
    count: (a && Date.now() - a.start < 600000 ? a.count : 0) + 1,
    start: a && Date.now() - a.start < 600000 ? a.start : Date.now(),
  });
  try {
    const { action, email, password } = await req.json();
    if (action === "logout") {
      const token = req.cookies.get(sessionCookie)?.value;
      if (token) await revokeSession(token);
      const res = sessionResponse({ ok: true });
      res.cookies.delete(sessionCookie);
      return res;
    }
    if (
      typeof email !== "string" ||
      !/^\S+@\S+\.\S+$/.test(email) ||
      email.length > 200 ||
      typeof password !== "string" ||
      password.length < 10 ||
      password.length > 128
    )
      return error("이메일과 10자 이상의 비밀번호를 입력해 주세요.");
    const normalized = email.trim().toLowerCase();
    if (action === "login") {
      const user = await login(normalized, password);
      if (!user) return error("이메일 또는 비밀번호를 확인해 주세요.", 401);
      return sessionResponse(
        await userResponse(user),
        await makeSession(user.id),
      );
    }
    if (action !== "register") return error("잘못된 요청입니다.");
    if (normalized === reservedAdministratorEmail())
      return error("관리자 계정은 기존 계정으로 로그인해 주세요.", 403);
    const existing = await emailExists(normalized);
    if (existing) return error("이미 사용 중인 이메일입니다.");
    let user = await authenticated(req);
    let token: string | undefined;
    if (user?.email) return error("이미 로그인되어 있습니다.");
    if (!user) {
      const g = await guestUser();
      user = g.user;
      token = g.token;
    }
    await register(user.id, normalized, password);
    const refreshed = (await authenticated(req)) || user;
    return sessionResponse(
      await userResponse({ ...refreshed, email: normalized }),
      token,
    );
  } catch {
    return error("계정을 처리하지 못했습니다. 다시 시도해 주세요.");
  }
}
