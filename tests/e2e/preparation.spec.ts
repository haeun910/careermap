import { test, expect } from "@playwright/test";
const nav = (page: any, name: string) =>
  page.locator("aside.sidebar nav").getByRole("button", { name, exact: true });
async function startEmpty(page: any) {
  await page.goto("/");
  await page
    .getByRole("button", { name: "내 공간 만들기", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("이름 · 닉네임").fill("준비 시작");
  await dialog.getByLabel("목표 직무").fill("기획");
  await dialog.getByRole("button", { name: "나만의 준비 시작" }).click();
  await expect(page.getByText("저장됨", { exact: true })).toBeVisible();
}
test.beforeEach(async ({ page }) => {
  await page.route("https://fonts.googleapis.com/**", (r) => r.abort());
});

test("guide and reflection retain answers and compare recorded responses after reset", async ({
  page,
}) => {
  await page.goto("/");
  await nav(page, "준비 가이드").click();
  await expect(
    page.getByRole("heading", { name: "처음 시작하는 커리어 준비 가이드" }),
  ).toBeVisible();
  await expect(page.getByText("0 / 7개 준비 자료 채움")).toBeVisible();
  await page
    .getByRole("button", { name: "자기분석 시작", exact: true })
    .click();
  await page
    .getByRole("link", { name: "집중해서 자기점검 시작", exact: true })
    .click();
  await page
    .getByRole("button", { name: "자기점검 시작", exact: true })
    .click();
  const panel = page.locator(".reflection-panel");
  for (let i = 0; i < 16; i++) {
    await panel
      .getByRole("radio", {
        name: i < 8 ? "매우 그래요" : "그런 편이에요",
        exact: true,
      })
      .check();
    await panel.getByRole("button", { name: "다음 질문", exact: true }).click();
  }
  for (let i = 0; i < 6; i++) {
    await panel.getByRole("radio").first().check();
    if (i === 0)
      await panel
        .getByRole("textbox", { name: /선택한 이유/ })
        .fill("기준을 먼저 확인하고 싶습니다.");
    await panel
      .getByRole("button", {
        name: i === 5 ? "답변 요약 보기" : "다음 질문",
        exact: true,
      })
      .click();
  }
  await expect(panel.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "22",
  );
  await expect(
    panel.getByText("두 답변의 방향이 달라요.", { exact: false }).first(),
  ).toBeVisible();
  await expect(
    panel.getByRole("button", { name: "점검 기록 남기기", exact: true }),
  ).toBeDisabled();
  await expect(
    panel.getByRole("combobox", { name: "점검 기록" }).locator("option"),
  ).toHaveCount(2);
  await expect(page.getByText("답변 저장됨", { exact: true })).toBeVisible();
  await page.reload();
  await expect(
    page.locator(".reflection-panel").getByRole("progressbar"),
  ).toHaveAttribute("aria-valuenow", "22");
  await page
    .getByRole("button", { name: "현재 답변 초기화", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "답변 초기화", exact: true })
    .click();
  await expect(
    page.locator(".reflection-panel").getByRole("progressbar"),
  ).toHaveAttribute("aria-valuenow", "0");
  await page
    .getByRole("button", { name: "이전 점검 기록 보기", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "이전 점검 기록", exact: true }),
  ).toBeVisible();
  const loaded = await (await page.request.get("/api/workspace")).json();
  expect(loaded.state.reflection.history).toHaveLength(1);
  expect(loaded.state.reflection.history[0].notes.s1).toBe(
    "기준을 먼저 확인하고 싶습니다.",
  );
});

test("master documents and answers work without jobs and company copies stay independent", async ({
  page,
}) => {
  const renderErrors: string[] = [];
  page.on("console", (msg) => {
    if (
      msg.type() === "error" &&
      msg.text().includes("Encountered two children")
    )
      renderErrors.push(msg.text());
  });
  await startEmpty(page);
  await nav(page, "이력서 · 자기소개서").click();
  await page.getByRole("button", { name: "이력서", exact: true }).click();
  await page.getByLabel("짧은 소개").fill("원본의 공통 경험");
  await page.getByRole("button", { name: "작업본 저장", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "제출본 확정", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "자소서", exact: true }).click();
  await page.getByRole("button", { name: "직무 역량", exact: true }).click();
  await page.getByRole("button", { name: "다음 단계", exact: true }).click();
  await page.getByRole("button", { name: "다음 단계", exact: true }).click();
  await page.getByLabel("문항 답변").fill("공고 없이 준비한 자기소개");
  await page.getByRole("button", { name: "작업본 저장", exact: true }).click();
  await nav(page, "면접 준비").click();
  await page.getByRole("button", { name: "질문 추가", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByLabel("질문", { exact: true })
    .fill("내 강점을 소개해 주세요.");
  await page
    .getByRole("dialog")
    .getByLabel("답변 · 핵심 키워드")
    .fill("공통 면접 답변");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "질문 저장", exact: true })
    .click();
  await expect(page.getByText("저장됨", { exact: true })).toBeVisible();
  await page.reload();
  await nav(page, "이력서 · 자기소개서").click();
  await page.getByRole("button", { name: /마스터 이력서/ }).click();
  await expect(page.getByLabel("짧은 소개")).toHaveValue("원본의 공통 경험");
  await nav(page, "희망기업").click();
  await page.getByRole("button", { name: "첫 기업 추가", exact: true }).click();
  await page
    .getByRole("dialog")
    .locator('[name="name"]')
    .fill("복사 테스트 기업");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "저장", exact: true })
    .click();
  await page.getByRole("button", { name: "공고 추가", exact: true }).click();
  await page.getByRole("dialog").getByLabel("공고명 · 지원 직무").fill("기획");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "지원 공간 저장", exact: true })
    .click();
  await nav(page, "이력서 · 자기소개서").click();
  await page.getByRole("button", { name: /마스터 이력서/ }).click();
  await page.getByLabel("짧은 소개").fill("복사 직전 수정한 공통 경험");
  await page
    .getByRole("combobox", { name: "복사할 보관함" })
    .selectOption({ label: "복사 테스트 기업 · 기획" });
  await page
    .getByRole("button", { name: "독립된 복사본 만들기", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "복사 테스트 기업 이력서", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("짧은 소개")).toHaveValue(
    "복사 직전 수정한 공통 경험",
  );
  await page.getByLabel("짧은 소개").fill("기업에 맞게 수정한 경험");
  await page.getByRole("button", { name: "작업본 저장", exact: true }).click();
  await page
    .getByRole("combobox", { name: "지원 공간", exact: true })
    .selectOption("");
  await page.getByRole("button", { name: /마스터 이력서/ }).click();
  await expect(page.getByLabel("짧은 소개")).toHaveValue(
    "복사 직전 수정한 공통 경험",
  );
  await nav(page, "면접 준비").click();
  await page
    .getByRole("combobox", { name: "준비할 지원 공간" })
    .selectOption("");
  const card = page.locator(".answer-card").first();
  await expect(card.getByRole("textbox")).toHaveValue("공통 면접 답변");
  await card
    .getByRole("combobox", { name: "복사할 보관함" })
    .selectOption({ label: "복사 테스트 기업 · 기획" });
  await card
    .getByRole("button", { name: "독립된 복사본 만들기", exact: true })
    .click();
  await expect(page.getByText("저장됨", { exact: true })).toBeVisible();
  const data = await (await page.request.get("/api/workspace")).json();
  expect(data.state.questions.filter((q: any) => !q.jobId)).toHaveLength(1);
  expect(data.state.questions.filter((q: any) => q.jobId)).toHaveLength(1);
  expect(
    data.state.documents.find((d: any) => d.jobId && d.kind === "이력서").text,
  ).toContain("기업에 맞게 수정한 경험");
  expect(renderErrors).toEqual([]);
});

test("guide and self-reflection remain usable on a narrow screen", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  for (const name of ["준비 가이드", "자기분석"]) {
    await page.getByRole("button", { name: "메뉴 열기" }).click();
    await nav(page, name).click();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page
    .getByRole("link", { name: "집중해서 자기점검 시작", exact: true })
    .click();
  await page
    .getByRole("button", { name: "자기점검 시작", exact: true })
    .click();
  await page.getByRole("radio", { name: "매우 그래요", exact: true }).check();
  await page.getByRole("button", { name: "다음 질문", exact: true }).click();
  await page.getByRole("radio", { name: "전혀 아니에요", exact: true }).check();
  await expect(
    page.locator(".reflection-panel").getByRole("progressbar"),
  ).toHaveAttribute("aria-valuenow", "2");
  await expect(page.locator("aside.sidebar")).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/reflection-mobile.png",
    animations: "disabled",
  });
  expect(errors).toEqual([]);
});
