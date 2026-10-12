import { z } from "zod";
import { query } from "./database";
import type { Announcement } from "./types";
export const announcementInput = z
  .object({
    title: z.string().trim().min(1).max(160),
    body: z.string().max(10000),
    published: z.boolean(),
    pinned: z.boolean(),
  })
  .strict()
  .refine(
    (v) => !v.published || !!v.body.trim(),
    "게시하려면 본문을 작성해 주세요.",
  );
type Input = z.infer<typeof announcementInput>;
type Row = {
  id: string;
  title: string;
  body: string;
  published: number;
  pinned: number;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  revision: number;
};
const fromRow = (r: Row): Announcement => ({
  id: r.id,
  title: r.title,
  body: r.body,
  published: !!r.published,
  pinned: !!r.pinned,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  publishedAt: r.published_at,
  revision: r.revision,
});
export async function listAnnouncements(includeDrafts = false) {
  const sql = includeDrafts
    ? "SELECT * FROM announcements ORDER BY updated_at DESC,id DESC LIMIT 100"
    : "SELECT * FROM announcements WHERE published=1 ORDER BY pinned DESC,published_at DESC,id DESC LIMIT 100";
  return (await query<Row>(sql)).rows.map(fromRow);
}
export async function findAnnouncement(id: string) {
  const row = (await query<Row>("SELECT * FROM announcements WHERE id=?", [id]))
    .rows[0];
  return row ? fromRow(row) : undefined;
}
export async function createAnnouncement(input: Input) {
  const id = crypto.randomUUID(),
    now = new Date().toISOString();
  await query(
    "INSERT INTO announcements (id,title,body,published,pinned,created_at,updated_at,published_at) VALUES (?,?,?,?,?,?,?,?)",
    [
      id,
      input.title,
      input.body,
      Number(input.published),
      Number(input.pinned),
      now,
      now,
      input.published ? now : null,
    ],
  );
  return (await findAnnouncement(id))!;
}
export async function updateAnnouncement(
  id: string,
  revision: number,
  input: Input,
) {
  const now = new Date().toISOString();
  const result = await query(
    "UPDATE announcements SET title=?,body=?,published=?,pinned=?,updated_at=?,published_at=CASE WHEN ?=1 THEN COALESCE(published_at,?) ELSE NULL END,revision=revision+1 WHERE id=? AND revision=?",
    [
      input.title,
      input.body,
      Number(input.published),
      Number(input.pinned),
      now,
      Number(input.published),
      now,
      id,
      revision,
    ],
  );
  return result.changes === 1 ? await findAnnouncement(id) : undefined;
}
export async function deleteAnnouncement(id: string, revision: number) {
  return (
    (
      await query("DELETE FROM announcements WHERE id=? AND revision=?", [
        id,
        revision,
      ])
    ).changes === 1
  );
}
