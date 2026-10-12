import { test, expect, type Locator, type Page } from "@playwright/test";
const draft = {
  draft: {
    title: "로그인 화면 구현",
    role: "로그인 화면 구현 담당",
    problem: "팀 프로젝트로 웹사이트를 만들었습니다.",
    action: "React로 로그인 화면을 만들고 오류를 수정했습니다.",
    result: "",
    learning: "",
    tags: ["React"],
  },
  sources: {
    title: ["contribution"],
    role: ["contribution"],
    problem: ["about"],
    action: ["contribution"],
    result: [],
    learning: [],
  },
  questions: [
    { field: "result", question: "실제로 확인한 변화나 결과가 있나요?" },
  ],
};
async function startEmptySpace(page: Page) {
  await page.goto("/");
  await page
    .getByRole("button", { name: "내 공간 만들기", exact: true })
    .click();
  const profile = page.getByRole("dialog");
  await profile.getByLabel("이름 · 닉네임").fill("초안 사용자");
  await profile.getByLabel("목표 직무").fill("프론트엔드 개발자");
  await Promise.all([
    page.waitForResponse(
      (r) =>
        r.url().endsWith("/api/workspace") &&
        r.request().method() === "PUT" &&
        r.status() === 200,
    ),
    profile
      .getByRole("button", { name: "나만의 준비 시작", exact: true })
      .click(),
  ]);
  await page
    .getByRole("button", { name: "프로젝트 추가", exact: true })
    .click();
}
const next = (form: Locator) =>
  form.getByRole("button", { name: "다음 질문", exact: true }).click();
async function toSummary(form: Locator) {
  await expect(
    form.getByRole("radiogroup", { name: "경험 유형", exact: true }),
  ).toBeVisible();
  await next(form);
  await expect(form.getByLabel("경험 설명", { exact: true })).toBeVisible();
  await next(form);
  await next(form);
  await next(form);
  await next(form);
  await form
    .getByRole("button", { name: "답변 확인하기", exact: true })
    .click();
}
test.beforeEach(async ({ page }) => {
  await page.route("https://fonts.googleapis.com/**", (r) => r.abort());
});
test("one question at a time, final AI generation, completed form and retryable save", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await startEmptySpace(page);
  const form = page.getByRole("dialog");
  await expect(
    form.getByRole("radiogroup", { name: "경험 유형", exact: true }),
  ).toBeVisible();
  await expect(form.locator("textarea")).toHaveCount(0);
  await expect(form.locator("[name=title]")).toHaveCount(0);
  // A private manual note remains private even when the user switches to the guide.
  await form
    .getByRole("button", { name: "직접 작성 · 수정", exact: true })
    .click();
  await form
    .locator("[name=privateNote]")
    .fill("AI에게 보내지 않을 비공개 메모");
  await form
    .getByRole("button", { name: "질문으로 시작", exact: true })
    .click();
  const inputs: any[] = [];
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/ai", async (route) => {
    inputs.push(route.request().postDataJSON());
    if (inputs.length === 1) await gate;
    const result =
      inputs.length === 1
        ? draft
        : {
            ...draft,
            draft: {
              ...draft.draft,
              title: "새 AI 제목",
              action: "새 AI 실행 제안",
              result: "동료들이 로그인 화면을 사용해 보았습니다.",
            },
            sources: { ...draft.sources, result: ["outcome"] },
            questions: [],
          };
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(result),
    });
  });
  await next(form);
  await form
    .getByLabel("경험 설명", { exact: true })
    .fill("팀 프로젝트로 웹사이트를 만들었어요.");
  await expect(form.locator("textarea")).toHaveCount(1);
  await expect(form.getByLabel("내가 한 일", { exact: true })).toHaveCount(0);
  await next(form);
  await form
    .getByLabel("내가 한 일", { exact: true })
    .fill("React로 로그인 화면을 만들고 오류를 수정했어요.");
  await form.getByRole("button", { name: "이전 질문", exact: true }).click();
  await expect(form.getByLabel("경험 설명", { exact: true })).toHaveValue(
    "팀 프로젝트로 웹사이트를 만들었어요.",
  );
  await next(form);
  await expect(form.getByLabel("내가 한 일", { exact: true })).toHaveValue(
    "React로 로그인 화면을 만들고 오류를 수정했어요.",
  );
  await next(form);
  await form.getByRole("button", { name: "건너뛰기", exact: true }).click();
  await form.getByLabel("경험 기간", { exact: true }).fill("2026.03");
  await next(form);
  await form
    .getByLabel("결과물 주소", { exact: true })
    .fill("ftp://example.invalid/result");
  await form
    .getByRole("button", { name: "답변 확인하기", exact: true })
    .click();
  await expect(form.getByRole("alert")).toContainText("http 또는 https");
  await form
    .getByLabel("결과물 주소", { exact: true })
    .fill("https://example.invalid/my-project");
  await form
    .getByRole("button", { name: "답변 확인하기", exact: true })
    .click();
  await expect(
    form.getByRole("heading", { name: "이제 하나의 프로젝트로 정리할게요" }),
  ).toBeVisible();
  expect(inputs).toHaveLength(0);
  await expect(form.locator("textarea")).toHaveCount(0);
  await form
    .getByRole("button", { name: "프로젝트 완성하기", exact: true })
    .click();
  expect(inputs).toHaveLength(0);
  await expect(
    form.getByRole("heading", { name: "AI에게 이 답변을 전달할까요?" }),
  ).toBeVisible();
  await form
    .getByRole("button", { name: "동의하고 프로젝트 완성하기", exact: true })
    .click();
  await expect(form.locator(".project-generation")).toContainText(
    "프로젝트를 정리하고 있어요",
  );
  await expect(form.locator("[name=title]")).toHaveCount(0);
  await expect(
    form.getByRole("button", { name: "직접 작성 · 수정", exact: true }),
  ).toBeDisabled();
  expect(inputs).toHaveLength(1);
  expect(Object.keys(inputs[0].projectInput)).toEqual([
    "category",
    "about",
    "contribution",
    "outcome",
    "additional",
  ]);
  expect(JSON.stringify(inputs[0])).not.toContain("AI에게 보내지 않을");
  expect(JSON.stringify(inputs[0])).not.toContain("2026.03");
  release();
  await expect(
    form.getByRole("heading", { name: "프로젝트 초안이 완성됐어요" }),
  ).toBeVisible();
  // There is no separate selection step before the completed form.
  await expect(form.locator("[name=title]")).toHaveValue("로그인 화면 구현");
  await expect(form.locator("[name=role]")).toHaveValue(
    "로그인 화면 구현 담당",
  );
  await expect(form.locator("[name=action]")).toHaveValue(draft.draft.action);
  await expect(form.locator("[name=result]")).toHaveValue("");
  await expect(form.locator("[name=period]")).toHaveValue("2026.03");
  await expect(form.locator("[name=link]")).toHaveValue(
    "https://example.invalid/my-project",
  );
  await expect(form.locator("[name=privateNote]")).toHaveValue(
    "AI에게 보내지 않을 비공개 메모",
  );
  expect(
    (await (await page.request.get("/api/workspace")).json()).state.projects,
  ).toHaveLength(0);
  await form
    .locator("[name=action]")
    .fill("React를 사용해 로그인 화면의 오류를 수정했습니다.");
  await page.route("**/api/workspace", async (route) => {
    if (route.request().method() === "PUT")
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: "저장 연결을 잠시 확인해 주세요." }),
      });
    else await route.continue();
  });
  await form.getByRole("button", { name: "경험 저장", exact: true }).click();
  await expect(form.getByRole("alert")).toContainText(
    "저장 연결을 잠시 확인해 주세요.",
  );
  await expect(form.locator("[name=action]")).toHaveValue(
    "React를 사용해 로그인 화면의 오류를 수정했습니다.",
  );
  await page.unroute("**/api/workspace");
  await form.getByRole("button", { name: "경험 저장", exact: true }).click();
  await expect(form).toHaveCount(0);
  const state = (await (await page.request.get("/api/workspace")).json()).state;
  expect(state.projects).toHaveLength(1);
  expect(state.projects[0].tags).toEqual(["React"]);
  expect(state.projects[0].privateNote).toBe("AI에게 보내지 않을 비공개 메모");
  const card = page
    .locator(".project-card")
    .filter({
      has: page.getByRole("heading", { name: "로그인 화면 구현", exact: true }),
    });
  await card.getByRole("button", { name: "편집", exact: true }).click();
  await form
    .getByRole("button", { name: "질문으로 시작", exact: true })
    .click();
  await toSummary(form);
  await form
    .getByRole("button", { name: "프로젝트 완성하기", exact: true })
    .click();
  await expect(
    form.getByRole("heading", { name: "프로젝트 초안이 완성됐어요" }),
  ).toBeVisible();
  await expect(form.locator("[name=title]")).toHaveValue("로그인 화면 구현");
  await expect(form.locator("[name=action]")).toHaveValue(
    "React를 사용해 로그인 화면의 오류를 수정했습니다.",
  );
  await form
    .getByRole("button", { name: "AI 초안 비교·보완", exact: true })
    .click();
  await expect(
    form.getByLabel("경험 이름 적용", { exact: true }),
  ).not.toBeChecked();
  await expect(
    form.getByLabel("실행 과정 적용", { exact: true }),
  ).not.toBeChecked();
  await form.getByRole("button", { name: "닫기", exact: true }).click();
  await page
    .locator("aside.sidebar nav")
    .getByRole("button", { name: "자기분석", exact: true })
    .click();
  await page.getByRole("button", { name: "AI 자기분석", exact: true }).click();
  await expect(form).toContainText(
    "AI 제안에는 외부 AI 서비스 Groq를 사용합니다.",
  );
  expect(inputs).toHaveLength(2);
  await form.getByRole("button", { name: "닫기", exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "로그인 화면 구현", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("mobile wizard keeps answers after an AI failure and supports manual completion", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await startEmptySpace(page);
  const form = page.getByRole("dialog");
  await next(form);
  await expect(
    form.getByRole("button", { name: "다음 질문", exact: true }),
  ).toBeDisabled();
  await form
    .getByLabel("경험 설명", { exact: true })
    .fill("동아리 모집 행사를 준비했어요.");
  await next(form);
  await form
    .getByLabel("내가 한 일", { exact: true })
    .fill("모집 안내 글을 쓰고 신청 폼을 만들었어요.");
  await next(form);
  await form.getByRole("button", { name: "건너뛰기", exact: true }).click();
  await form.getByRole("button", { name: "건너뛰기", exact: true }).click();
  await form.getByRole("button", { name: "건너뛰기", exact: true }).click();
  await page.route("**/api/ai", (r) =>
    r.fulfill({
      status: 502,
      contentType: "application/json",
      body: JSON.stringify({
        error: "무료 API를 잠시 사용할 수 없습니다. 입력은 유지됩니다.",
      }),
    }),
  );
  await form
    .getByRole("button", { name: "프로젝트 완성하기", exact: true })
    .click();
  await form
    .getByRole("button", { name: "동의하고 프로젝트 완성하기", exact: true })
    .click();
  await expect(form.getByRole("alert")).toContainText("입력은 유지됩니다.");
  await expect(form.locator(".project-answer-review")).toContainText(
    "동아리 모집 행사를 준비했어요.",
  );
  await form
    .getByRole("button", { name: "경험 설명 수정", exact: true })
    .click();
  await expect(form.getByLabel("경험 설명", { exact: true })).toHaveValue(
    "동아리 모집 행사를 준비했어요.",
  );
  await next(form);
  await next(form);
  await next(form);
  await next(form);
  await form
    .getByRole("button", { name: "답변 확인하기", exact: true })
    .click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await form
    .getByRole("button", { name: "AI 없이 답변으로 완성하기", exact: true })
    .click();
  await expect(form.locator("[name=problem]")).toHaveValue(
    "동아리 모집 행사를 준비했어요.",
  );
  await expect(form.locator("[name=action]")).toHaveValue(
    "모집 안내 글을 쓰고 신청 폼을 만들었어요.",
  );
  await expect(form.locator("[name=result]")).toHaveValue("");
  await form.getByRole("button", { name: "경험 저장", exact: true }).click();
  await expect(form).toHaveCount(0);
  await expect(
    page.getByRole("heading", {
      name: "동아리 모집 행사를 준비했어요.",
      exact: true,
    }),
  ).toBeVisible();
});
