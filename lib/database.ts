import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { createClient, type Client } from "@libsql/client/http";

const schema = [
  "CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT UNIQUE, password TEXT, state TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 0)",
  "CREATE TABLE IF NOT EXISTS project_evidence (id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,project_id TEXT NOT NULL,name TEXT NOT NULL,mime TEXT NOT NULL,size INTEGER NOT NULL,created_at TEXT NOT NULL,content TEXT NOT NULL)",
  "CREATE INDEX IF NOT EXISTS project_evidence_owner_project ON project_evidence(user_id,project_id)",
  "CREATE TRIGGER IF NOT EXISTS project_evidence_cleanup AFTER UPDATE OF state ON users BEGIN DELETE FROM project_evidence WHERE user_id=NEW.id AND NOT EXISTS (SELECT 1 FROM json_each(NEW.state,'$.projects') p WHERE json_extract(p.value,'$.id')=project_evidence.project_id); END",
  "CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,expires INTEGER NOT NULL)",
  "CREATE TABLE IF NOT EXISTS publications (slug TEXT PRIMARY KEY,user_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,snapshot TEXT NOT NULL,updated_at TEXT NOT NULL)",
  "CREATE TABLE IF NOT EXISTS ai_usage (user_id TEXT NOT NULL,created_at INTEGER NOT NULL)",
  "CREATE INDEX IF NOT EXISTS ai_usage_created ON ai_usage(created_at)",
  "CREATE INDEX IF NOT EXISTS ai_usage_user_created ON ai_usage(user_id,created_at)",
  "CREATE TABLE IF NOT EXISTS site_owner (slot INTEGER PRIMARY KEY CHECK(slot=1), user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, config_hash TEXT NOT NULL)",
  "CREATE TABLE IF NOT EXISTS announcements (id TEXT PRIMARY KEY,title TEXT NOT NULL,body TEXT NOT NULL,published INTEGER NOT NULL DEFAULT 0,pinned INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,published_at TEXT,revision INTEGER NOT NULL DEFAULT 0)",
];
type Connection = { local?: DatabaseSync; remote?: Client };
const shared = globalThis as unknown as {
  careermapDatabase?: Promise<Connection>;
};

async function connect(): Promise<Connection> {
  const provider =
    process.env.CAREERMAP_DATABASE_PROVIDER ||
    (process.env.TURSO_DATABASE_URL || process.env.VERCEL ? "turso" : "sqlite");
  if (provider === "turso") {
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;
    if (!url || !authToken)
      throw new Error(
        "영구 저장소 설정이 필요합니다. 관리자에게 문의해 주세요.",
      );
    const parsed = new URL(url);
    const localHttp =
      !process.env.VERCEL &&
      parsed.protocol === "http:" &&
      ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname);
    if (
      (!localHttp && !["libsql:", "https:"].includes(parsed.protocol)) ||
      parsed.searchParams.get("tls") === "0"
    )
      throw new Error("저장소 주소는 libsql 또는 HTTPS 주소여야 합니다.");
    const remote = createClient({
      url,
      authToken,
      fetch: (input: RequestInfo | URL, init?: RequestInit) =>
        fetch(input, { ...init, signal: AbortSignal.timeout(15000) }),
    });
    try {
      await remote.batch(schema, "write");
      return { remote };
    } catch {
      remote.close();
      throw new Error(
        "저장소에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      );
    }
  }
  if (provider !== "sqlite" || process.env.VERCEL)
    throw new Error("이 배포 환경에는 영구 저장소가 필요합니다.");
  const dir = resolve(
    /* turbopackIgnore: true */ process.env.CAREERMAP_DATA_DIR || ".data",
  );
  mkdirSync(dir, { recursive: true });
  const local = new DatabaseSync(resolve(dir, "careermap.sqlite"));
  local.exec(
    "PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;",
  );
  for (const sql of schema) local.exec(sql);
  return { local };
}

export async function query<T = Record<string, unknown>>(
  sql: string,
  args: (string | number | null)[] = [],
): Promise<{ rows: T[]; changes: number }> {
  shared.careermapDatabase ??= connect().catch((e) => {
    shared.careermapDatabase = undefined;
    throw e;
  });
  const connection = await shared.careermapDatabase;
  if (connection.remote) {
    try {
      const result = await connection.remote.execute({ sql, args });
      return {
        rows: result.rows as unknown as T[],
        changes: result.rowsAffected,
      };
    } catch {
      throw new Error(
        "저장소 요청에 실패했습니다. 잠시 후 다시 시도해 주세요.",
      );
    }
  }
  const statement = connection.local!.prepare(sql);
  if (/^\s*SELECT\b/i.test(sql))
    return { rows: statement.all(...args) as T[], changes: 0 };
  return { rows: [], changes: Number(statement.run(...args).changes) };
}

export async function closeDatabase() {
  const pending = shared.careermapDatabase;
  shared.careermapDatabase = undefined;
  if (!pending) return;
  const connection = await pending;
  connection.local?.close();
  connection.remote?.close();
}
