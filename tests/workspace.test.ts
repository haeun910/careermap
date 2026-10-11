import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { NextRequest } from "next/server";
import { sampleWorkspace } from "../lib/seed";
import { portfolioSnapshot } from "../lib/portfolio";
import { aiContext } from "../lib/ai";
import { validateRelationships, workspaceSchema } from "../lib/schema";
import type { WorkspaceResponse, Document } from "../lib/types";
const dir = mkdtempSync(join(tmpdir(), "careermap-test-"));
process.env.CAREERMAP_DATA_DIR = dir;
process.env.CAREERMAP_DATABASE_PROVIDER = "sqlite";
delete process.env.VERCEL;
if (process.env.CAREERMAP_TEST_DATABASE_URL) {
  // The remote transport suite is allowed to write only to a local test server.
  const url = new URL(process.env.CAREERMAP_TEST_DATABASE_URL);
  assert.equal(url.protocol, "http:");
  assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(url.hostname));
  process.env.CAREERMAP_DATABASE_PROVIDER = "turso";
  process.env.TURSO_DATABASE_URL = url.toString();
  process.env.TURSO_AUTH_TOKEN = "local-test-unused";
}
const store = await import("../lib/store");
const workspace = await import("../app/api/workspace/route");
const auth = await import("../app/api/auth/route");
const portfolio = await import("../app/api/portfolio/route");
after(async () => {
  await store.closeDatabase();
  rmSync(dir, { recursive: true, force: true });
});
function request(
  path: string,
  method = "GET",
  body?: unknown,
  cookie?: string,
  origin = "http://careermap.test",
) {
  return new NextRequest("http://careermap.test" + path, {
    method,
    headers: {
      host: "careermap.test",
      origin,
      ...(body ? { "content-type": "application/json" } : {}),
      ...(cookie ? { cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}
async function guest() {
  const r = await workspace.GET(request("/api/workspace"));
  return {
    cookie: r.headers.get("set-cookie")!.split(";")[0],
    data: (await r.json()) as WorkspaceResponse,
  };
}

test("workspaces persist independently; invalid relationships and stale writes fail", async () => {
  const a = await guest(),
    b = await guest();
  a.data.state.profile.name = "저장한 이름";
  const saved = await workspace.PUT(
    request("/api/workspace", "PUT", a.data, a.cookie),
  );
  assert.equal(saved.status, 200);
  assert.equal(
    (
      await (
        await workspace.GET(
          request("/api/workspace", "GET", undefined, a.cookie),
        )
      ).json()
    ).state.profile.name,
    "저장한 이름",
  );
  assert.equal(
    (
      await (
        await workspace.GET(
          request("/api/workspace", "GET", undefined, b.cookie),
        )
      ).json()
    ).state.profile.name,
    "지민",
  );
  assert.equal(
    (await workspace.PUT(request("/api/workspace", "PUT", a.data, a.cookie)))
      .status,
    409,
  );
  const invalid = structuredClone(a.data);
  invalid.revision = 1;
  invalid.state.jobs[0].projectIds = ["missing"];
  assert.equal(
    (await workspace.PUT(request("/api/workspace", "PUT", invalid, a.cookie)))
      .status,
    400,
  );
  assert.equal(
    (
      await workspace.PUT(
        request(
          "/api/workspace",
          "PUT",
          { ...a.data, revision: 1 },
          a.cookie,
          "https://other.test",
        ),
      )
    ).status,
    403,
  );
});

test("submitted documents remain immutable and interview context uses original snapshots", async () => {
  const a = await guest(),
    s = a.data.state;
  const job = s.jobs[0],
    project = s.projects[0];
  const doc: Document = {
    id: "test-doc",
    jobId: job.id,
    kind: "이력서",
    title: "제출본",
    text: "제출 당시의 서류",
    question: "",
    limit: 0,
    projectIds: [project.id],
    versions: [],
    submitted: {
      text: "제출 당시의 서류",
      date: new Date().toISOString(),
      projectSnapshots: [structuredClone(project)],
      jobSnapshot: structuredClone(job),
    },
  };
  s.documents.push(doc);
  assert.equal(
    (await workspace.PUT(request("/api/workspace", "PUT", a.data, a.cookie)))
      .status,
    200,
  );
  s.projects[0].title = "수정된 원본";
  s.jobs[0].description = "다른 공고";
  a.data.revision = 1;
  assert.equal(
    (await workspace.PUT(request("/api/workspace", "PUT", a.data, a.cookie)))
      .status,
    200,
  );
  const ctx = aiContext(s, "questions", job.id);
  assert.equal(
    ctx.data.projects[0].title,
    doc.submitted!.projectSnapshots[0].title,
  );
  assert.equal(
    ctx.data.job!.description,
    doc.submitted!.jobSnapshot.description,
  );
  assert.ok(!JSON.stringify(ctx).includes("privateNote"));
  assert.ok(!JSON.stringify(ctx).includes("수정된 원본"));
  doc.submitted!.text = "변조";
  a.data.revision = 2;
  assert.equal(
    (await workspace.PUT(request("/api/workspace", "PUT", a.data, a.cookie)))
      .status,
    400,
  );
  s.documents = [];
  assert.equal(
    (await workspace.PUT(request("/api/workspace", "PUT", a.data, a.cookie)))
      .status,
    400,
  );
});

test("account login and public portfolio honor ownership, publication snapshots, and withdrawal", async () => {
  const a = await guest();
  const email = "portfolio-test@example.com",
    password = "Test-password-12345";
  assert.equal(
    (await portfolio.POST(request("/api/portfolio", "POST", {}, a.cookie)))
      .status,
    401,
  );
  const registered = await auth.POST(
    request(
      "/api/auth",
      "POST",
      { action: "register", email, password },
      a.cookie,
    ),
  );
  assert.equal(registered.status, 200);
  assert.equal((await registered.json()).guest, false);
  const wrong = await auth.POST(
    request("/api/auth", "POST", {
      action: "login",
      email,
      password: "Wrong-password-12345",
    }),
  );
  assert.equal(wrong.status, 401);
  const logged = await auth.POST(
    request("/api/auth", "POST", { action: "login", email, password }),
  );
  assert.equal(logged.status, 200);
  assert.equal(
    (await logged.json()).state.profile.name,
    a.data.state.profile.name,
  );
  const publicResponse = await portfolio.POST(
    request("/api/portfolio", "POST", {}, a.cookie),
  );
  assert.equal(publicResponse.status, 200);
  const { slug } = await publicResponse.json();
  const snapshot = await store.getPublished(slug);
  assert.equal(snapshot.projects.length, 2);
  assert.equal(snapshot.email, "");
  assert.ok(!JSON.stringify(snapshot).includes("privateNote"));
  assert.ok(!JSON.stringify(snapshot).includes("selfAnalysis"));
  assert.ok(!JSON.stringify(snapshot).includes("documents"));
  const b = await guest();
  await portfolio.DELETE(
    request("/api/portfolio", "DELETE", undefined, b.cookie),
  );
  assert.ok(await store.getPublished(slug));
  a.data.state.projects[0].title = "변경한 프로젝트";
  await workspace.PUT(request("/api/workspace", "PUT", a.data, a.cookie));
  assert.notEqual(
    (await store.getPublished(slug)).projects[0].title,
    "변경한 프로젝트",
  );
  await portfolio.POST(request("/api/portfolio", "POST", {}, a.cookie));
  assert.equal(
    (await store.getPublished(slug)).projects[0].title,
    "변경한 프로젝트",
  );
  await portfolio.DELETE(
    request("/api/portfolio", "DELETE", undefined, a.cookie),
  );
  assert.equal(await store.getPublished(slug), undefined);
  await auth.POST(request("/api/auth", "POST", { action: "logout" }, a.cookie));
  assert.equal(
    (await workspace.PUT(request("/api/workspace", "PUT", a.data, a.cookie)))
      .status,
    401,
  );
});

test("public overrides can suppress sensitive results; schemas reject unsafe input", () => {
  const s = sampleWorkspace();
  s.portfolio.projectOverrides[s.projects[0].id] = {
    title: "공개용 제목",
    result: "",
  };
  const snapshot = portfolioSnapshot(s);
  assert.equal(snapshot.projects[0].result, "");
  assert.equal(snapshot.projects[0].title, "공개용 제목");
  s.projects[0].link = "javascript:alert(1)";
  assert.equal(workspaceSchema.safeParse(s).success, false);
  s.projects[0].link = "";
  s.jobs[0].projectIds = ["unknown"];
  assert.equal(validateRelationships(s), false);
});

test("sessions and edits survive a database connection restart", async () => {
  const a = await guest();
  a.data.state.profile.name = "재시작 후 유지할 이름";
  assert.equal(
    (await workspace.PUT(request("/api/workspace", "PUT", a.data, a.cookie)))
      .status,
    200,
  );
  await store.closeDatabase();
  const r = await workspace.GET(
    request("/api/workspace", "GET", undefined, a.cookie),
  );
  const restored = await r.json();
  assert.equal(restored.state.profile.name, "재시작 후 유지할 이름");
  assert.equal(restored.revision, 1);
});

test("concurrent AI requests share user and global reservations", async () => {
  const first = await Promise.all(
    Array.from({ length: 8 }, () => store.checkAiLimit("limit-user-a")),
  );
  assert.equal(first.filter(Boolean).length, 3);
  const second = await Promise.all(
    Array.from({ length: 8 }, () => store.checkAiLimit("limit-user-b")),
  );
  assert.equal(second.filter(Boolean).length, 2);
});

test("Vercel cannot silently fall back to temporary SQLite storage", async () => {
  await store.closeDatabase();
  process.env.VERCEL = "1";
  const previousProvider = process.env.CAREERMAP_DATABASE_PROVIDER;
  process.env.CAREERMAP_DATABASE_PROVIDER = "sqlite";
  try {
    const r = await workspace.GET(request("/api/workspace"));
    assert.equal(r.status, 503);
    assert.ok((await r.json()).error);
  } finally {
    delete process.env.VERCEL;
    process.env.CAREERMAP_DATABASE_PROVIDER = previousProvider;
  }
});
