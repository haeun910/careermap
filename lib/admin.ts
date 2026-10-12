import { createHash } from "node:crypto";
import { query } from "./database";

// Configured only on the server. Ordinary signup cannot claim the reserved owner email.
export function reservedAdministratorEmail() {
  return (process.env.IEUM_ADMIN_EMAIL || "").trim().toLowerCase();
}
export async function administratorUserId(): Promise<string | undefined> {
  const explicitId = process.env.IEUM_ADMIN_USER_ID?.trim();
  if (explicitId)
    return (
      await query<{ id: string }>(
        "SELECT id FROM users WHERE id=? AND email IS NOT NULL",
        [explicitId],
      )
    ).rows[0]?.id;
  const email = reservedAdministratorEmail();
  if (!email) return undefined;
  const configHash = createHash("sha256").update(email).digest("hex");
  const current = (
    await query<{ user_id: string; config_hash: string }>(
      "SELECT user_id,config_hash FROM site_owner WHERE slot=1",
    )
  ).rows[0];
  if (current?.config_hash === configHash) return current.user_id;
  // Bind an already-registered account's immutable ID, never an editable profile.
  const owner = (
    await query<{ id: string }>("SELECT id FROM users WHERE email=?", [email])
  ).rows[0];
  if (!owner) return undefined;
  await query(
    "INSERT INTO site_owner (slot,user_id,config_hash) VALUES (1,?,?) ON CONFLICT(slot) DO UPDATE SET user_id=excluded.user_id,config_hash=excluded.config_hash",
    [owner.id, configHash],
  );
  return owner.id;
}

export async function isAdministrator(user?: {
  id: string;
  email: string | null;
}) {
  const ownerId = await administratorUserId();
  return !!user?.email && !!ownerId && user.id === ownerId;
}
