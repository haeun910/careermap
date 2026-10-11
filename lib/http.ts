import { NextRequest, NextResponse } from "next/server";
import { findSession } from "./store";
export const sessionCookie = "careermap_session";
export function authenticated(req: NextRequest) {
  return findSession(req.cookies.get(sessionCookie)?.value);
}
export function sameOrigin(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host === req.headers.get("host");
  } catch {
    return false;
  }
}
export function error(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}
export function sessionResponse(data: unknown, token?: string) {
  const response = NextResponse.json(data, {
    headers: { "Cache-Control": "no-store" },
  });
  if (token)
    response.cookies.set(sessionCookie, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 30 * 86400,
    });
  return response;
}
