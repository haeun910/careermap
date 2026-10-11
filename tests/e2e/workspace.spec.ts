import { test, expect } from "@playwright/test";
test.beforeEach(async ({ page }) => {
  await page.route("https://fonts.googleapis.com/**", (r) => r.abort());
});
const nav = (page: any, name: string) =>
  page.locator("aside.sidebar nav").getByRole("button", { name, exact: true });

test("onboarding, project, application, submission and interview answers persist", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "지민님, 다음 커리어를 준비해 볼까요?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "내 공간 만들기" }).click();
  const profile = page.getByRole("dialog");
  await profile.getByLabel("이름 · 닉네임").fill("테스트 사용자");
  await profile
    .getByLabel("어떤 준비를 하고 있나요?")
    .selectOption("경력 이직");
  await profile.getByLabel("목표 직무").fill("프론트엔드 개발자");
  await profile.getByRole("button", { name: "나만의 준비 시작" }).click();
  await page
    .getByRole("button", { name: "프로젝트 추가", exact: true })
    .click();
  const project = page.getByRole("dialog");
  await project.getByLabel("프로젝트 · 경험 이름").fill("접근성 개선 프로젝트");
  await project.locator('[name="role"]').fill("프론트엔드 개발 담당");
  await project
    .locator('[name="problem"]')
    .fill("키보드로 사용할 수 없는 화면을 발견했습니다.");
  await project
    .locator('[name="action"]')
    .fill("키보드 탐색과 시맨틱 마크업을 구현했습니다.");
  await project
    .locator('[name="result"]')
    .fill("핵심 화면의 키보드 탐색을 지원했습니다.");
  await project
    .locator('[name="privateNote"]')
    .fill("절대 공개하면 안 되는 비공개 기록");
  await project.getByRole("button", { name: "경험 저장" }).click();
  await expect(
    page.getByRole("heading", { name: "접근성 개선 프로젝트" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", {
      name: "테스트 사용자님, 다음 커리어를 준비해 볼까요?",
    }),
  ).toBeVisible();
  await nav(page, "희망기업").click();
  await page.getByRole("button", { name: "기업 추가", exact: true }).click();
  const company = page.getByRole("dialog");
  await company.locator('[name="name"]').fill("테스트 기업");
  await company.getByRole("button", { name: "저장", exact: true }).click();
  await page.getByRole("button", { name: "공고 추가", exact: true }).click();
  const job = page.getByRole("dialog");
  await job.getByLabel("공고명 · 지원 직무").fill("프론트엔드 엔지니어");
  await job
    .locator('[name="description"]')
    .fill("React 및 접근성 개선 경험이 있는 개발자를 찾습니다.");
  await job.getByRole("button", { name: "지원 공간 저장" }).click();
  await page.getByRole("button", { name: "지원 서류", exact: true }).click();
  await page.getByRole("button", { name: "이력서 추가", exact: true }).click();
  await page
    .getByLabel("서류 본문")
    .fill("접근성 개선 프로젝트에서 키보드 탐색을 구현했습니다.");
  await page.getByText("접근성 개선 프로젝트", { exact: true }).last().click();
  await page.getByRole("button", { name: "작업본 저장", exact: true }).click();
  await expect(page.getByText("저장된 작업본", { exact: true })).toBeVisible();
  await page.route("**/api/ai", (route) =>
    route.fulfill({
      status: 502,
      contentType: "application/json",
      body: JSON.stringify({ error: "무료 API를 잠시 사용할 수 없습니다." }),
    }),
  );
  await page.getByRole("button", { name: "경험 기반 AI 초안" }).click();
  await expect(
    page
      .getByRole("dialog")
      .getByText("AI 제안에는 외부 AI 서비스 Groq를 사용합니다."),
  ).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "동의하고 제안 받기" })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "무료 API를 잠시 사용할 수 없습니다.",
  );
  await expect(page.getByLabel("서류 본문")).toHaveValue(
    "접근성 개선 프로젝트에서 키보드 탐색을 구현했습니다.",
  );
  await page.unroute("**/api/ai");
  await page.getByRole("button", { name: "제출본 확정", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "제출본 확정", exact: true })
    .click();
  await expect(page.getByText("제출본이 확정되었습니다.")).toBeVisible();
  await nav(page, "프로젝트 · 경험").click();
  await page.getByRole("button", { name: "편집", exact: true }).click();
  await page
    .getByRole("dialog")
    .locator('[name="result"]')
    .fill("원본의 성과가 변경되었습니다.");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "경험 저장" })
    .click();
  await nav(page, "면접 준비").click();
  await page.getByRole("button", { name: "질문 추가", exact: true }).click();
  const question = page.getByRole("dialog");
  await question
    .getByLabel("질문", { exact: true })
    .fill("어떤 접근성 문제를 해결했나요?");
  await question
    .getByLabel("답변 · 핵심 키워드")
    .fill("키보드 탐색을 지원하도록 개선했습니다.");
  await question.getByRole("button", { name: "질문 저장" }).click();
  await expect(
    page.getByRole("heading", { name: "어떤 접근성 문제를 해결했나요?" }),
  ).toBeVisible();
  const result = await (await page.request.get("/api/workspace")).json();
  expect(result.state.documents[0].submitted.projectSnapshots[0].result).toBe(
    "핵심 화면의 키보드 탐색을 지원했습니다.",
  );
  expect(result.state.profile.type).toBe("경력 이직");
  expect(result.state.questions).toHaveLength(1);
  expect(errors).toEqual([]);
});

test("portfolio preview, account, public snapshot and withdrawal work", async ({
  page,
}) => {
  await page.goto("/");
  await nav(page, "내 포트폴리오").click();
  await page.getByRole("button", { name: "미리보기", exact: true }).click();
  await expect(
    page.getByRole("dialog").locator(".portfolio-page"),
  ).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "닫기", exact: true })
    .click();
  await page
    .getByRole("button", { name: "사이트 공개하기", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "선택한 내용 공개" })
    .click();
  const account = page.getByRole("dialog");
  await account
    .getByLabel("이메일", { exact: true })
    .fill(`test-${crypto.randomUUID()}@example.com`);
  await account
    .getByLabel("비밀번호", { exact: true })
    .fill("Test-password-12345");
  await account
    .locator("form")
    .getByRole("button", { name: "계정 만들기", exact: true })
    .click();
  await page
    .getByRole("button", { name: "사이트 공개하기", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "선택한 내용 공개" })
    .click();
  await expect(
    page.getByRole("link", { name: "공개 사이트 보기" }),
  ).toBeVisible();
  const href = await page
    .getByRole("link", { name: "공개 사이트 보기" })
    .getAttribute("href");
  const publicPage = await page.context().newPage();
  await publicPage.goto(href!);
  await expect(
    publicPage.getByRole("heading", { name: "지민의 포트폴리오" }),
  ).toBeVisible();
  expect(await publicPage.content()).not.toContain("privateNote");
  await page.getByRole("button", { name: "공개 해제", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "사이트 공개하기", exact: true }),
  ).toBeVisible();
  const gone = await publicPage.goto(href!);
  expect(gone?.status()).toBe(404);
});

test("desktop and mobile layouts have no horizontal overflow or console errors", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /지민님/ })).toBeVisible();
  await page.screenshot({
    path: "test-results/dashboard-desktop.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "test-results/dashboard-mobile.png",
    fullPage: true,
    animations: "disabled",
  });
  for (const name of [
    "자기분석",
    "프로젝트 · 경험",
    "희망기업",
    "이력서 · 자기소개서",
    "면접 준비",
    "내 포트폴리오",
  ]) {
    await page.getByRole("button", { name: "메뉴 열기" }).click();
    await nav(page, name).click();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.getByRole("button", { name: "미리보기", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(errors).toEqual([]);
});
