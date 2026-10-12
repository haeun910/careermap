import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { NextRequest } from "next/server";
import { portfolioSnapshot } from "../lib/portfolio";
import { aiContext } from "../lib/ai";
import { EVIDENCE_FILE_LIMIT } from "../lib/evidence-limits";
const dir = mkdtempSync(join(tmpdir(), "ieum-evidence-"));
process.env.CAREERMAP_DATA_DIR = dir;
process.env.CAREERMAP_DATABASE_PROVIDER = "sqlite";
delete process.env.VERCEL;
const store = await import("../lib/store");
const { query } = await import("../lib/database");
const evidence = await import("../lib/evidence");
const list = await import("../app/api/projects/[projectId]/evidence/route");
const item = await import(
  "../app/api/projects/[projectId]/evidence/[id]/route"
);
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a5AAAAABJRU5ErkJggg==",
  "base64",
);
let owner: Awaited<ReturnType<typeof store.guestUser>>,
  other: typeof owner,
  projectId: string;
before(async () => {
  owner = await store.guestUser();
  other = await store.guestUser();
  projectId = JSON.parse(owner.user.state).projects[0].id;
});
after(async () => {
  await store.closeDatabase();
  rmSync(dir, { recursive: true, force: true });
});
const context = (id?: string) => ({
  params: Promise.resolve({ projectId, id: id || "" }),
});
function request(
  method: string,
  token = owner.token,
  file?: File,
  origin = "http://ieum.test",
) {
  const form = new FormData();
  if (file) form.set("file", file);
  return new NextRequest(
    "http://ieum.test/api/projects/" + projectId + "/evidence",
    {
      method,
      headers: {
        host: "ieum.test",
        origin,
        ...(token ? { cookie: "careermap_session=" + token } : {}),
      },
      ...(method === "POST" ? { body: form } : {}),
    },
  );
}
test("private uploads survive reconnection, preserve bytes, and never enter workspace, AI or portfolio", async () => {
  const before = (await store.findSession(owner.token))!.state;
  const uploaded = await list.POST(
    request(
      "POST",
      owner.token,
      new File([png], "경험 화면.png", { type: "image/png" }),
    ),
    context(),
  );
  assert.equal(uploaded.status, 200);
  const { file } = await uploaded.json();
  assert.equal(file.size, png.length);
  assert.ok(!("content" in file));
  await store.closeDatabase();
  const metadata = await (await list.GET(request("GET"), context())).json();
  assert.equal(metadata.files[0].name, "경험 화면.png");
  assert.ok(!("content" in metadata.files[0]));
  const download = await item.GET(request("GET"), context(file.id));
  assert.deepEqual(Buffer.from(await download.arrayBuffer()), png);
  assert.equal(download.headers.get("cache-control"), "private, no-store");
  assert.equal(download.headers.get("x-content-type-options"), "nosniff");
  assert.match(
    download.headers.get("content-disposition")!,
    /^attachment;.*filename\*=UTF-8''/,
  );
  assert.equal((await store.findSession(owner.token))!.state, before);
  const state = JSON.parse(before);
  assert.ok(
    !JSON.stringify(aiContext(state, "self")).includes("경험 화면.png"),
  );
  assert.ok(!JSON.stringify(portfolioSnapshot(state)).includes(file.id));
  // Guessing IDs cannot disclose or remove another user's evidence.
  assert.deepEqual(
    (await (await list.GET(request("GET", other.token), context())).json())
      .files,
    [],
  );
  assert.equal(
    (await item.GET(request("GET", other.token), context(file.id))).status,
    404,
  );
  assert.equal(
    (await item.DELETE(request("DELETE", other.token), context(file.id)))
      .status,
    404,
  );
  assert.equal(
    (await item.GET(request("GET", ""), context(file.id))).status,
    401,
  );
  assert.equal(
    (
      await item.DELETE(
        request("DELETE", owner.token, undefined, "https://foreign.test"),
        context(file.id),
      )
    ).status,
    403,
  );
  assert.equal(
    (await list.POST(request("POST", "", new File([png], "a.png")), context()))
      .status,
    401,
  );
  assert.equal(
    (
      await list.POST(
        request(
          "POST",
          owner.token,
          new File([png], "a.png"),
          "https://foreign.test",
        ),
        context(),
      )
    ).status,
    403,
  );
  assert.equal(
    (await item.DELETE(request("DELETE"), context(file.id))).status,
    200,
  );
  assert.equal((await item.GET(request("GET"), context(file.id))).status, 404);
});
test("rejects spoofed types, executable files, empty data and oversized bodies even without content-length", async () => {
  for (const file of [
    new File(["<svg onload='alert(1)'/>"], "a.svg", { type: "image/svg+xml" }),
    new File(["<html>hello</html>"], "a.png", { type: "image/png" }),
    new File([png], "a.pdf", { type: "application/pdf" }),
    new File([png], "a.png", { type: "text/html" }),
  ])
    assert.equal(
      (await list.POST(request("POST", owner.token, file), context())).status,
      400,
    );
  assert.equal(
    (
      await list.POST(
        request("POST", owner.token, new File([], "a.png")),
        context(),
      )
    ).status,
    413,
  );
  const large = new File(
    [Buffer.alloc(EVIDENCE_FILE_LIMIT + 65537)],
    "large.png",
    { type: "image/png" },
  );
  const encoded = request("POST", owner.token, large);
  const req = new NextRequest(encoded.url, {
    method: "POST",
    headers: encoded.headers,
    body: await encoded.arrayBuffer(),
  });
  assert.equal(req.headers.get("content-length"), null);
  assert.equal((await list.POST(req, context())).status, 413);
  assert.equal(
    (await evidence.listEvidence(owner.user.id, projectId)).files.length,
    0,
  );
});
test("PDF downloads are attachments and concurrent uploads respect count and total space; deleting an experience cleans its files atomically", async () => {
  const pdf = new File(
    ["%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF\n"],
    "수료증.pdf",
    { type: "application/pdf" },
  );
  const file = await evidence.addEvidence(owner.user.id, projectId, pdf);
  const req = new NextRequest(
    "http://ieum.test/api/projects/test/evidence/test?preview=1",
    { headers: { cookie: "careermap_session=" + owner.token } },
  );
  const download = await item.GET(req, context(file.id));
  assert.equal(download.headers.get("content-type"), "application/pdf");
  assert.match(download.headers.get("content-disposition")!, /^attachment/);
  await evidence.deleteEvidence(owner.user.id, projectId, file.id);
  const results = await Promise.allSettled(
    Array.from({ length: 12 }, () =>
      evidence.addEvidence(
        owner.user.id,
        projectId,
        new File([png], "same.png", { type: "image/png" }),
      ),
    ),
  );
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 10);
  assert.equal(
    new Set(
      (await evidence.listEvidence(owner.user.id, projectId)).files.map(
        (f) => f.id,
      ),
    ).size,
    10,
  );
  // Deletion through the ordinary workspace save performs cleanup in the same DB transaction.
  const state = JSON.parse((await store.findSession(owner.token))!.state);
  state.projects = state.projects.filter(
    (p: { id: string }) => p.id !== projectId,
  );
  assert.ok(await store.saveWorkspace(owner.user.id, state, 0));
  assert.equal(
    (
      await query<{ n: number }>(
        "SELECT count(*) AS n FROM project_evidence WHERE user_id=?",
        [owner.user.id],
      )
    ).rows[0].n,
    0,
  );
  await assert.rejects(
    () =>
      evidence.addEvidence(owner.user.id, projectId, new File([png], "a.png")),
    /찾을 수/,
  );
  const otherState = JSON.parse(other.user.state);
  const bigPng = Buffer.alloc(EVIDENCE_FILE_LIMIT);
  png.copy(bigPng);
  const all = await Promise.allSettled(
    Array.from({ length: 12 }, (_, i) =>
      evidence.addEvidence(
        other.user.id,
        otherState.projects[i % 2].id,
        new File([bigPng], "large.png", { type: "image/png" }),
      ),
    ),
  );
  assert.equal(all.filter((r) => r.status === "fulfilled").length, 10);
  assert.equal(
    (await evidence.listEvidence(other.user.id, otherState.projects[0].id))
      .used,
    20 * 1024 * 1024,
  );
});
