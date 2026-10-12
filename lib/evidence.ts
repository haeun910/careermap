import { randomUUID } from "node:crypto";
import { query } from "./database";
import {
  EVIDENCE_FILE_LIMIT,
  EVIDENCE_USER_LIMIT,
  EVIDENCE_PROJECT_LIMIT,
  type EvidenceFile,
} from "./evidence-limits";

export class EvidenceError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
const projectExists = `EXISTS (SELECT 1 FROM users u, json_each(u.state,'$.projects') p WHERE u.id=? AND json_extract(p.value,'$.id')=?)`;
const metadata = "id,name,mime,size,created_at AS createdAt";
export async function requireProject(userId: string, projectId: string) {
  if (
    !(
      await query(`SELECT id FROM users WHERE id=? AND ${projectExists}`, [
        userId,
        userId,
        projectId,
      ])
    ).rows.length
  )
    throw new EvidenceError(
      "저장된 경험을 찾을 수 없습니다. 경험을 먼저 저장해 주세요.",
      404,
    );
}
export async function listEvidence(userId: string, projectId: string) {
  await requireProject(userId, projectId);
  const files = (
    await query<EvidenceFile>(
      `SELECT ${metadata} FROM project_evidence WHERE user_id=? AND project_id=? ORDER BY created_at,id`,
      [userId, projectId],
    )
  ).rows;
  const used = (
    await query<{ size: number }>(
      "SELECT coalesce(sum(size),0) AS size FROM project_evidence WHERE user_id=?",
      [userId],
    )
  ).rows[0].size;
  return { files, used, limit: EVIDENCE_USER_LIMIT };
}
function identify(bytes: Buffer, name: string, declared: string) {
  const extension = name.split(".").at(-1)?.toLowerCase();
  let mime = "";
  if (
    bytes.length >= 24 &&
    bytes
      .subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) &&
    bytes.subarray(12, 16).toString() === "IHDR"
  )
    mime = "image/png";
  else if (
    bytes.length >= 4 &&
    bytes[0] === 255 &&
    bytes[1] === 216 &&
    bytes[2] === 255 &&
    bytes.at(-2) === 255 &&
    bytes.at(-1) === 217
  )
    mime = "image/jpeg";
  else if (
    bytes.length >= 16 &&
    bytes.subarray(0, 4).toString() === "RIFF" &&
    bytes.subarray(8, 12).toString() === "WEBP" &&
    bytes.readUInt32LE(4) + 8 === bytes.length
  )
    mime = "image/webp";
  else if (
    bytes.subarray(0, 5).toString() === "%PDF-" &&
    bytes.subarray(-1024).toString().includes("%%EOF")
  )
    mime = "application/pdf";
  const extensions: Record<string, string[]> = {
    "image/png": ["png"],
    "image/jpeg": ["jpg", "jpeg"],
    "image/webp": ["webp"],
    "application/pdf": ["pdf"],
  };
  if (
    !mime ||
    !extensions[mime].includes(extension || "") ||
    (declared && declared !== mime && declared !== "application/octet-stream")
  )
    throw new EvidenceError(
      "파일 내용과 형식을 확인해 주세요. PNG·JPG·WebP 사진과 PDF만 첨부할 수 있습니다.",
    );
  return mime;
}
export async function addEvidence(
  userId: string,
  projectId: string,
  file: File,
) {
  await requireProject(userId, projectId);
  if (!file.size || file.size > EVIDENCE_FILE_LIMIT)
    throw new EvidenceError(
      "파일은 비어 있지 않아야 하며, 한 개당 2 MB까지 첨부할 수 있습니다.",
      413,
    );
  const name = file.name
    .replace(/[\x00-\x1f\x7f/\\]/g, "_")
    .trim()
    .slice(0, 180);
  const bytes = Buffer.from(await file.arrayBuffer());
  const mime = identify(bytes, name, file.type);
  const evidence: EvidenceFile = {
    id: randomUUID(),
    name,
    mime,
    size: bytes.length,
    createdAt: new Date().toISOString(),
  };
  // One SQL statement reserves both count and space across concurrent instances.
  const result = await query(
    `INSERT INTO project_evidence (id,user_id,project_id,name,mime,size,created_at,content)
    SELECT ?,?,?,?,?,?,?,? WHERE ${projectExists}
    AND (SELECT count(*) FROM project_evidence WHERE user_id=? AND project_id=?)<?
    AND (SELECT coalesce(sum(size),0) FROM project_evidence WHERE user_id=?)+?<=?
    AND (SELECT coalesce(sum(size),0) FROM project_evidence)+?<=?`,
    [
      evidence.id,
      userId,
      projectId,
      name,
      mime,
      evidence.size,
      evidence.createdAt,
      bytes.toString("base64"),
      userId,
      projectId,
      userId,
      projectId,
      EVIDENCE_PROJECT_LIMIT,
      userId,
      evidence.size,
      EVIDENCE_USER_LIMIT,
      evidence.size,
      200 * 1024 * 1024,
    ],
  );
  if (!result.changes) {
    await requireProject(userId, projectId);
    throw new EvidenceError(
      "첨부 공간이 부족합니다. 경험당 10개, 내 공간 전체 20 MB까지 저장할 수 있습니다. 불필요한 첨부를 삭제한 뒤 다시 시도해 주세요.",
      409,
    );
  }
  return evidence;
}
export async function getEvidence(
  userId: string,
  projectId: string,
  id: string,
) {
  const row = (
    await query<EvidenceFile & { content: string }>(
      `SELECT ${metadata},content FROM project_evidence WHERE id=? AND user_id=? AND project_id=? AND ${projectExists}`,
      [id, userId, projectId, userId, projectId],
    )
  ).rows[0];
  if (!row) throw new EvidenceError("첨부 자료를 찾을 수 없습니다.", 404);
  return row;
}
export async function deleteEvidence(
  userId: string,
  projectId: string,
  id: string,
) {
  const result = await query(
    `DELETE FROM project_evidence WHERE id=? AND user_id=? AND project_id=? AND ${projectExists}`,
    [id, userId, projectId, userId, projectId],
  );
  if (!result.changes)
    throw new EvidenceError("첨부 자료를 찾을 수 없습니다.", 404);
}
export function evidenceFailure(cause: unknown) {
  return Response.json(
    {
      error:
        cause instanceof EvidenceError
          ? cause.message
          : "첨부 자료를 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.",
    },
    {
      status: cause instanceof EvidenceError ? cause.status : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
