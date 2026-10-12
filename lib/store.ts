import {
  createHash,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { query } from "./database";
import { sampleWorkspace } from "./seed";
import { administratorUserId } from "./admin";
import type { Workspace, WorkspaceResponse } from "./types";
export { closeDatabase } from "./database";
type UserRow = {
  id: string;
  email: string | null;
  password: string | null;
  state: string;
  revision: number;
};
export const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export async function findSession(
  token?: string,
): Promise<UserRow | undefined> {
  if (!token) return;
  return (
    await query<UserRow>(
      "SELECT u.* FROM users u JOIN sessions s ON u.id=s.user_id WHERE s.token=? AND s.expires>?",
      [hashToken(token), Date.now()],
    )
  ).rows[0];
}
export async function makeSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  await query("INSERT INTO sessions VALUES (?,?,?)", [
    hashToken(token),
    userId,
    Date.now() + 30 * 86400000,
  ]);
  return token;
}
export async function guestUser() {
  const id = crypto.randomUUID();
  await query("INSERT INTO users (id,state) VALUES (?,?)", [
    id,
    JSON.stringify(sampleWorkspace()),
  ]);
  return {
    user: (await query<UserRow>("SELECT * FROM users WHERE id=?", [id]))
      .rows[0],
    token: await makeSession(id),
  };
}
export async function userResponse(user: UserRow): Promise<WorkspaceResponse> {
  const p = (
    await query<{ slug: string; updated_at: string }>(
      "SELECT slug,updated_at FROM publications WHERE user_id=?",
      [user.id],
    )
  ).rows[0];
  const administratorId = await administratorUserId();
  return {
    state: JSON.parse(user.state),
    revision: user.revision,
    guest: !user.email,
    admin: !!user.email && user.id === administratorId,
    adminSetupReady: !!administratorId,
    publication: p ? { slug: p.slug, updatedAt: p.updated_at } : null,
  };
}
export async function saveWorkspace(
  userId: string,
  state: Workspace,
  revision: number,
) {
  return (
    (
      await query(
        "UPDATE users SET state=?,revision=revision+1 WHERE id=? AND revision=?",
        [JSON.stringify(state), userId, revision],
      )
    ).changes === 1
  );
}
export function passwordHash(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}
export function passwordMatches(password: string, hash: string) {
  const [salt, digest] = hash.split(":");
  try {
    return timingSafeEqual(
      scryptSync(password, salt, 64),
      Buffer.from(digest, "hex"),
    );
  } catch {
    return false;
  }
}
export async function login(email: string, password: string) {
  const user = (
    await query<UserRow>("SELECT * FROM users WHERE email=?", [email])
  ).rows[0];
  return user?.password && passwordMatches(password, user.password)
    ? user
    : undefined;
}
export async function emailExists(email: string) {
  return (
    (await query("SELECT id FROM users WHERE email=?", [email])).rows.length > 0
  );
}
export async function register(
  userId: string,
  email: string,
  password: string,
) {
  await query(
    "UPDATE users SET email=?,password=? WHERE id=? AND email IS NULL",
    [email, passwordHash(password), userId],
  );
}
export async function revokeSession(token: string) {
  await query("DELETE FROM sessions WHERE token=?", [hashToken(token)]);
}
export async function checkAiLimit(userId: string) {
  const now = Date.now();
  await query("DELETE FROM ai_usage WHERE created_at<?", [now - 86400000]);
  // Reserve atomically: separate Vercel instances share this limit.
  return (
    (
      await query(
        `INSERT INTO ai_usage (user_id,created_at)
    SELECT ?,? WHERE
    (SELECT count(*) FROM ai_usage WHERE user_id=? AND created_at>?)<40 AND
    (SELECT count(*) FROM ai_usage WHERE user_id=? AND created_at>?)<3 AND
    (SELECT count(*) FROM ai_usage WHERE created_at>?)<5`,
        [userId, now, userId, now - 86400000, userId, now - 60000, now - 60000],
      )
    ).changes === 1
  );
}
export async function publication(userId: string) {
  return (
    await query<{ slug: string }>(
      "SELECT slug FROM publications WHERE user_id=?",
      [userId],
    )
  ).rows[0];
}
export async function publish(userId: string, snapshot: unknown) {
  const slug =
    (await publication(userId))?.slug || randomBytes(12).toString("hex");
  await query(
    "INSERT INTO publications VALUES (?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET snapshot=excluded.snapshot,updated_at=excluded.updated_at",
    [slug, userId, JSON.stringify(snapshot), new Date().toISOString()],
  );
  return (await publication(userId))!.slug;
}
export async function unpublish(userId: string) {
  await query("DELETE FROM publications WHERE user_id=?", [userId]);
}
export async function getPublished(slug: string) {
  const row = (
    await query<{ snapshot: string }>(
      "SELECT snapshot FROM publications WHERE slug=?",
      [slug],
    )
  ).rows[0];
  return row ? JSON.parse(row.snapshot) : undefined;
}
