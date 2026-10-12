import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { NextRequest } from "next/server";
const dir = mkdtempSync(join(tmpdir(), "ieum-admin-test-"));
process.env.CAREERMAP_DATA_DIR = dir;
process.env.CAREERMAP_DATABASE_PROVIDER = "sqlite";
delete process.env.VERCEL;
delete process.env.IEUM_ADMIN_EMAIL;
delete process.env.IEUM_ADMIN_USER_ID;
const store = await import("../lib/store");
const permissions = await import("../lib/admin");
const admin = await import("../app/api/admin/announcements/route");
const publicNotices = await import("../app/api/announcements/route");
const auth = await import("../app/api/auth/route");
const workspace = await import("../app/api/workspace/route");
let ownerToken: string,
  memberToken: string,
  guestToken: string,
  ownerId: string,
  memberId: string;
before(async () => {
  const owner = await store.guestUser(),
    member = await store.guestUser(),
    guest = await store.guestUser();
  await store.register(
    owner.user.id,
    "owner@ieum.example.invalid",
    "Admin-test-password-123",
  );
  await store.register(
    member.user.id,
    "member@ieum.example.invalid",
    "Member-test-password-123",
  );
  ownerToken = owner.token;
  memberToken = member.token;
  guestToken = guest.token;
  ownerId = owner.user.id;
  memberId = member.user.id;
  process.env.IEUM_ADMIN_EMAIL = " OWNER@IEUM.EXAMPLE.INVALID ";
});
after(async () => {
  await store.closeDatabase();
  rmSync(dir, { recursive: true, force: true });
  delete process.env.IEUM_ADMIN_EMAIL;
  delete process.env.IEUM_ADMIN_USER_ID;
});
function req(
  method = "GET",
  body?: unknown,
  token?: string,
  origin = "http://ieum.test",
  path = "/api/admin/announcements",
) {
  return new NextRequest("http://ieum.test" + path, {
    method,
    headers: {
      host: "ieum.test",
      origin,
      ...(token ? { cookie: "careermap_session=" + token } : {}),
      ...(body ? { "content-type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}
const input = {
  title: "초안 공지",
  body: "초안은 비공개",
  published: false,
  pinned: false,
};
test("only the configured existing account ID gets administrator metadata", async () => {
  const owner = await store.findSession(ownerToken),
    member = await store.findSession(memberToken);
  assert.equal(await permissions.isAdministrator(owner), true);
  assert.equal(await permissions.isAdministrator(member), false);
  assert.equal(
    await permissions.isAdministrator(await store.findSession(guestToken)),
    false,
  );
  const ownerResponse = await store.userResponse(owner!);
  assert.equal(ownerResponse.admin, true);
  assert.equal(ownerResponse.adminSetupReady, true);
  const state = JSON.parse(member!.state);
  state.profile.name = "owner@ieum.example.invalid";
  await store.saveWorkspace(memberId, state, member!.revision);
  assert.equal(
    (await store.userResponse((await store.findSession(memberToken))!)).admin,
    false,
  );
  const serialized = JSON.stringify(ownerResponse);
  assert.ok(!serialized.includes("owner@ieum.example.invalid"));
});
test("anonymous and ordinary accounts cannot read or modify administrative notices", async () => {
  for (const token of [undefined, guestToken, memberToken]) {
    assert.equal((await admin.GET(req("GET", undefined, token))).status, 403);
    assert.equal(
      (
        await admin.POST(
          req("POST", { announcement: input, admin: true }, token),
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await admin.PATCH(
          req("PATCH", { id: "fake", revision: 0, announcement: input }, token),
        )
      ).status,
      403,
    );
    assert.equal(
      (await admin.DELETE(req("DELETE", { id: "fake", revision: 0 }, token)))
        .status,
      403,
    );
  }
  assert.equal(
    (
      await admin.POST(
        req(
          "POST",
          { announcement: input },
          ownerToken,
          "https://foreign.test",
        ),
      )
    ).status,
    403,
  );
  const member = await store.userResponse(
    (await store.findSession(memberToken))!,
  );
  const forged = await workspace.PUT(
    req(
      "PUT",
      { state: member.state, revision: member.revision, admin: true },
      memberToken,
      "http://ieum.test",
      "/api/workspace",
    ),
  );
  assert.equal(forged.status, 200);
  assert.equal(
    (await store.userResponse((await store.findSession(memberToken))!)).admin,
    false,
  );
});
test("drafts stay private; publication, revision conflicts, withdrawal and deletion work", async () => {
  const created = await admin.POST(
    req("POST", { announcement: input }, ownerToken),
  );
  assert.equal(created.status, 200);
  const row = (await created.json()).announcement;
  assert.equal(
    (await (await publicNotices.GET()).json()).announcements.length,
    0,
  );
  assert.equal(
    (await (await admin.GET(req("GET", undefined, ownerToken))).json())
      .announcements.length,
    1,
  );
  const published = await admin.PATCH(
    req(
      "PATCH",
      {
        id: row.id,
        revision: 0,
        announcement: {
          ...input,
          published: true,
          pinned: true,
          body: "게시된 안내",
        },
      },
      ownerToken,
    ),
  );
  assert.equal(published.status, 200);
  const latest = (await published.json()).announcement;
  assert.equal(latest.revision, 1);
  const visible = (await (await publicNotices.GET()).json()).announcements;
  assert.equal(visible.length, 1);
  assert.equal(visible[0].body, "게시된 안내");
  assert.equal(visible[0].pinned, true);
  assert.equal(
    (
      await admin.PATCH(
        req(
          "PATCH",
          { id: row.id, revision: 0, announcement: input },
          ownerToken,
        ),
      )
    ).status,
    409,
  );
  assert.equal(
    (await admin.DELETE(req("DELETE", { id: row.id, revision: 0 }, ownerToken)))
      .status,
    409,
  );
  const hidden = await admin.PATCH(
    req("PATCH", { id: row.id, revision: 1, announcement: input }, ownerToken),
  );
  assert.equal(hidden.status, 200);
  assert.equal(
    (await (await publicNotices.GET()).json()).announcements.length,
    0,
  );
  assert.equal(
    (await admin.DELETE(req("DELETE", { id: row.id, revision: 2 }, ownerToken)))
      .status,
    200,
  );
  assert.equal(
    (await (await admin.GET(req("GET", undefined, ownerToken))).json())
      .announcements.length,
    0,
  );
});
test("an unregistered reserved email cannot acquire admin through public signup", async () => {
  const previous = process.env.IEUM_ADMIN_EMAIL;
  process.env.IEUM_ADMIN_EMAIL = "reserved@ieum.example.invalid";
  try {
    assert.equal(await permissions.administratorUserId(), undefined);
    assert.equal(
      await permissions.isAdministrator(await store.findSession(ownerToken)),
      false,
    );
    const result = await auth.POST(
      req(
        "POST",
        {
          action: "register",
          email: "reserved@ieum.example.invalid",
          password: "Reserved-test-password-123",
        },
        guestToken,
        "http://ieum.test",
        "/api/auth",
      ),
    );
    assert.equal(result.status, 403);
    assert.equal(
      await store.emailExists("reserved@ieum.example.invalid"),
      false,
    );
  } finally {
    process.env.IEUM_ADMIN_EMAIL = previous;
  }
});
test("an explicit server ID selects a single account and missing IDs fail closed", async () => {
  process.env.IEUM_ADMIN_USER_ID = memberId;
  assert.equal(
    await permissions.isAdministrator(await store.findSession(memberToken)),
    true,
  );
  assert.equal(
    await permissions.isAdministrator(await store.findSession(ownerToken)),
    false,
  );
  process.env.IEUM_ADMIN_USER_ID = "missing-id";
  assert.equal(
    await permissions.isAdministrator(await store.findSession(ownerToken)),
    false,
  );
  delete process.env.IEUM_ADMIN_USER_ID;
  assert.equal(await permissions.administratorUserId(), ownerId);
});
