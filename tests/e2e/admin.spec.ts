import { test, expect } from "@playwright/test";

test("IEUM branding and owner-only notices work on desktop and mobile", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("https://fonts.googleapis.com/**", (r) => r.abort());
  await page.goto("/");
  await expect(page).toHaveTitle("이음(IEUM) — 나의 다음 커리어");
  await expect(page.locator(".brand-name")).toContainText("이음");
  const nav = (name: string) =>
    page
      .locator("aside.sidebar nav")
      .getByRole("button", { name, exact: true });
  await expect(nav("관리자 모드")).toHaveCount(0);
  expect((await page.request.get("/api/admin/announcements")).status()).toBe(
    403,
  );
  await nav("이음 소식").click();
  await expect(page.getByText("아직 등록된 공지가 없어요")).toBeVisible();

  await page.getByRole("button", { name: "로그인", exact: true }).click();
  const auth = page.getByRole("dialog");
  await auth.getByRole("button", { name: "로그인", exact: true }).click();
  await auth
    .getByLabel("이메일", { exact: true })
    .fill("owner@ieum.example.invalid");
  await auth
    .getByLabel("비밀번호", { exact: true })
    .fill("Local-e2e-password-12345");
  await auth
    .locator("form")
    .getByRole("button", { name: "로그인", exact: true })
    .click();
  await expect(nav("관리자 모드")).toBeVisible();
  await nav("관리자 모드").click();
  await expect(
    page.getByRole("heading", { name: "관리자 모드", exact: true }),
  ).toBeVisible();
  await page.getByLabel("공지 제목", { exact: true }).fill("첫 번째 이음 안내");
  await page
    .getByLabel("공지 본문", { exact: true })
    .fill("준비 기록을 한곳에서 이어가세요.");
  await page.getByLabel("공지 목록 상단에 고정").check();
  await page.getByRole("button", { name: "초안 저장", exact: true }).click();
  await expect(page.locator('.notice-feedback[role="status"]')).toContainText(
    "방문자에게는 보이지 않습니다.",
  );
  expect(
    (await (await page.request.get("/api/announcements")).json()).announcements,
  ).toHaveLength(0);

  await page.getByRole("button", { name: "미리보기", exact: true }).click();
  await expect(
    page.getByRole("dialog").getByText("준비 기록을 한곳에서 이어가세요."),
  ).toBeVisible();
  await page.getByRole("button", { name: "작성으로 돌아가기" }).click();
  await page.getByRole("button", { name: "공지 게시", exact: true }).click();
  await expect(page.locator('.notice-feedback[role="status"]')).toContainText(
    "공지가 게시됐습니다.",
  );
  let publicItems = (
    await (await page.request.get("/api/announcements")).json()
  ).announcements;
  expect(publicItems).toHaveLength(1);
  expect(publicItems[0].pinned).toBe(true);
  await page.getByRole("button", { name: "이음 소식 보기" }).click();
  await page.locator("details.notice-card summary").click();
  await expect(
    page.getByText("준비 기록을 한곳에서 이어가세요.", { exact: true }),
  ).toBeVisible();
  await nav("관리자 모드").click();
  await page
    .locator(".notice-nav")
    .filter({ hasText: "첫 번째 이음 안내" })
    .click();
  await page
    .getByLabel("공지 본문", { exact: true })
    .fill("마스터 자료도 함께 준비할 수 있어요.");
  await page.getByRole("button", { name: "새 공지 작성" }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "저장하지 않은 변경 사항이 있어요",
  );
  await page.getByRole("button", { name: "계속 작성" }).click();
  await expect(page.getByLabel("공지 본문", { exact: true })).toHaveValue(
    "마스터 자료도 함께 준비할 수 있어요.",
  );
  await page.getByRole("button", { name: "게시 내용 저장" }).click();
  await expect(page.locator('.notice-feedback[role="status"]')).toContainText(
    "공지가 게시됐습니다.",
  );
  publicItems = (await (await page.request.get("/api/announcements")).json())
    .announcements;
  expect(publicItems[0].body).toBe("마스터 자료도 함께 준비할 수 있어요.");

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByLabel("공지 제목", { exact: true })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "공개 해제하고 저장" }).click();
  await expect(page.locator('.notice-feedback[role="status"]')).toContainText(
    "방문자에게는 보이지 않습니다.",
  );
  expect(
    (await (await page.request.get("/api/announcements")).json()).announcements,
  ).toHaveLength(0);
  await page.getByRole("button", { name: "삭제", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "공지 삭제" })
    .click();
  await expect(page.locator('.notice-feedback[role="status"]')).toContainText(
    "공지를 삭제했습니다.",
  );
  await page.setViewportSize({ width: 1440, height: 720 });
  await page.getByRole("button", { name: "로그아웃" }).click();
  await expect(nav("관리자 모드")).toHaveCount(0);
  expect((await page.request.get("/api/admin/announcements")).status()).toBe(
    403,
  );
  expect(errors).toEqual([]);
});
