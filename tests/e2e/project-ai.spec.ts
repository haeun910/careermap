import { test, expect } from "@playwright/test";
const draft = {
  draft: {
    title: "로그인 화면 구현",
    role: "로그인 화면 구현 담당",
    problem: "",
    action: "React로 로그인 화면을 만들고 오류를 수정했습니다.",
    result: "",
    learning: "",
    tags: ["React"],
  },
  sources: {
    title: ["contribution"],
    role: ["contribution"],
    problem: [],
    action: ["contribution"],
    result: [],
    learning: [],
  },
  questions: [
    { field: "result", question: "실제로 확인한 변화나 결과가 있나요?" },
  ],
};
async function startEmptySpace(page: import("@playwright/test").Page) {
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
}
test.beforeEach(async ({ page }) => {
  await page.route("https://fonts.googleapis.com/**", (r) => r.abort());
});
test("short answers, consent, follow-ups, editable review and retryable saving work", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await startEmptySpace(page);
  const before = (await (await page.request.get("/api/workspace")).json())
    .state;
  await page
    .getByRole("button", { name: "프로젝트 추가", exact: true })
    .click();
  const form = page.getByRole("dialog");
  await expect(
    form.getByLabel("1. 어떤 경험이었나요?", { exact: true }),
  ).toBeVisible();
  await form
    .getByLabel("1. 어떤 경험이었나요?", { exact: true })
    .fill("팀 프로젝트에서 웹사이트를 만들었어요.");
  await form
    .getByLabel("2. 내가 직접 한 일은 무엇인가요?", { exact: true })
    .fill("React로 로그인 화면을 만들고 오류를 수정했어요.");
  await form
    .getByRole("button", { name: "직접 작성 · 수정", exact: true })
    .click();
  await form.locator("[name=period]").fill("2026.03");
  await form.locator("[name=link]").fill("https://example.invalid/my-project");
  await form
    .locator("[name=privateNote]")
    .fill("AI에게 보내지 않을 비공개 메모");
  await form
    .getByRole("button", { name: "AI와 짧게 시작", exact: true })
    .click();
  const inputs: any[] = [];
  await page.route("**/api/ai", async (route) => {
    const body = route.request().postDataJSON();
    inputs.push(body);
    const next =
      inputs.length === 1
        ? draft
        : {
            ...draft,
            draft: {
              ...draft.draft,
              result: "동료들이 로그인 화면을 사용해 보았습니다.",
            },
            sources: { ...draft.sources, result: ["additional"] },
            questions: [],
          };
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(next),
    });
  });
  await form
    .getByRole("button", { name: "AI로 초안 만들기", exact: true })
    .click();
  await expect(
    form.getByRole("heading", { name: "AI에게 이 답변을 전달할까요?" }),
  ).toBeVisible();
  expect(inputs).toHaveLength(0);
  await expect(form).toContainText(
    "비공개 메모·이름·이메일·다른 프로젝트는 전달하지 않습니다.",
  );
  await form
    .getByRole("button", { name: "동의하고 초안 만들기", exact: true })
    .click();
  await expect(
    form.getByRole("heading", { name: "초안을 확인해 주세요" }),
  ).toBeVisible();
  expect(JSON.stringify(inputs[0])).not.toContain("AI에게 보내지 않을");
  expect(Object.keys(inputs[0].projectInput)).toEqual([
    "category",
    "about",
    "contribution",
    "outcome",
    "additional",
  ]);
  expect(
    (await (await page.request.get("/api/workspace")).json()).state.projects,
  ).toHaveLength(before.projects.length);
  await expect(
    form.getByLabel("결과 · 성과 초안", { exact: true }),
  ).toHaveValue("");
  await form
    .getByLabel("보완 답변 1", { exact: true })
    .fill("동료들이 로그인 화면을 써봤어요.");
  await form
    .locator(".project-followups")
    .getByRole("button", { name: "보완 답변으로 다시 만들기", exact: true })
    .click();
  await expect(
    form.getByLabel("결과 · 성과 초안", { exact: true }),
  ).toHaveValue("동료들이 로그인 화면을 사용해 보았습니다.");
  expect(inputs[1].projectInput.additional).toContain(
    "동료들이 로그인 화면을 써봤어요.",
  );
  expect(inputs[1].projectInput.additional).not.toContain(
    draft.questions[0].question,
  );
  await expect(
    form.getByLabel("기억해 낸 추가 내용", { exact: true }),
  ).toHaveValue("결과 · 성과: 동료들이 로그인 화면을 써봤어요.");
  await form
    .getByLabel("실행 과정 초안", { exact: true })
    .fill("React를 사용해 로그인 화면의 오류를 수정했습니다.");
  await form
    .getByRole("button", { name: "선택한 초안 반영", exact: true })
    .click();
  await expect(
    form.getByLabel("프로젝트 · 경험 이름", { exact: true }),
  ).toHaveValue("로그인 화면 구현");
  await expect(form.locator("[name=action]")).toHaveValue(
    "React를 사용해 로그인 화면의 오류를 수정했습니다.",
  );
  await expect(form.locator("[name=privateNote]")).toHaveValue(
    "AI에게 보내지 않을 비공개 메모",
  );
  await expect(form.locator("[name=period]")).toHaveValue("2026.03");
  await expect(form.locator("[name=link]")).toHaveValue(
    "https://example.invalid/my-project",
  );
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
  const after = (await (await page.request.get("/api/workspace")).json()).state;
  expect(after.projects).toHaveLength(before.projects.length + 1);
  const saved = after.projects.find((p: any) => p.title === "로그인 화면 구현");
  expect(saved.result).toBe("동료들이 로그인 화면을 사용해 보았습니다.");
  expect(saved.tags).toEqual(["React"]);
  expect(saved.privateNote).toBe("AI에게 보내지 않을 비공개 메모");
  // Existing fields are not preselected for replacement by another AI proposal.
  await page
    .locator("aside.sidebar nav")
    .getByRole("button", { name: "프로젝트 · 경험", exact: true })
    .click();
  const card = page.locator(".project-card").filter({
    has: page.getByRole("heading", { name: "로그인 화면 구현", exact: true }),
  });
  await card.getByRole("button", { name: "편집", exact: true }).click();
  await form
    .getByRole("button", { name: "AI와 짧게 시작", exact: true })
    .click();
  await form
    .getByRole("button", { name: "AI로 초안 만들기", exact: true })
    .click();
  // Consent survives within this workspace session, even across editor instances.
  await expect(
    form.getByRole("heading", { name: "초안을 확인해 주세요" }),
  ).toBeVisible();
  await expect(
    form.getByLabel("경험 이름 적용", { exact: true }),
  ).not.toBeChecked();
  await expect(
    form.getByLabel("실행 과정 적용", { exact: true }),
  ).not.toBeChecked();
  await expect(
    form.getByLabel("결과 · 성과 적용", { exact: true }),
  ).not.toBeChecked();
  await form.getByRole("button", { name: "닫기", exact: true }).click();
  await page
    .locator("aside.sidebar nav")
    .getByRole("button", { name: "자기분석", exact: true })
    .click();
  await page.getByRole("button", { name: "AI 자기분석", exact: true }).click();
  // Project-only consent does not authorize other AI task payloads.
  await expect(form).toContainText(
    "AI 제안에는 외부 AI 서비스 Groq를 사용합니다.",
  );
  expect(inputs).toHaveLength(3);
  await form.getByRole("button", { name: "닫기", exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "로그인 화면 구현", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("AI outage retains short answers; manual fallback works on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await startEmptySpace(page);
  await page
    .getByRole("button", { name: "프로젝트 추가", exact: true })
    .click();
  const form = page.getByRole("dialog");
  await form
    .getByLabel("1. 어떤 경험이었나요?", { exact: true })
    .fill("동아리 모집 행사를 준비했어요.");
  await form
    .getByLabel("2. 내가 직접 한 일은 무엇인가요?", { exact: true })
    .fill("모집 안내 글을 쓰고 신청 폼을 만들었어요.");
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
    .getByRole("button", { name: "AI로 초안 만들기", exact: true })
    .click();
  await form
    .getByRole("button", { name: "동의하고 초안 만들기", exact: true })
    .click();
  await expect(form.getByRole("alert")).toContainText("입력은 유지됩니다.");
  await expect(
    form.getByLabel("1. 어떤 경험이었나요?", { exact: true }),
  ).toHaveValue("동아리 모집 행사를 준비했어요.");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await form
    .getByRole("button", { name: "답변을 직접 옮겨 쓰기", exact: true })
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
