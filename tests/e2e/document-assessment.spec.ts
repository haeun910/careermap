import { test, expect } from "@playwright/test";
import { allReflectionQuestions, emptyReflection } from "../../lib/reflection";
const nav = (page: any, name: string) =>
  page.locator("aside.sidebar nav").getByRole("button", { name, exact: true });
test("multiple cover questions keep independent answers and selected AI generation; resume preview uses fields", async ({
  page,
}) => {
  await page.goto("/");
  await nav(page, "이력서 · 자기소개서").click();
  await page.getByRole("button", { name: "이력서", exact: true }).click();
  await expect(page.getByLabel("서류 본문")).toHaveCount(0);
  await page.getByLabel("이력서 이메일").fill("private@example.invalid");
  await page
    .getByLabel("짧은 소개")
    .fill("사용자 흐름을 개선하는 디자이너입니다.");
  await page.getByRole("button", { name: "3 역량·경험", exact: true }).click();
  await page
    .getByRole("button", { name: "일상을 바꾸는 금융 경험", exact: true })
    .click();
  await page
    .getByRole("button", { name: "4 완성본 확인", exact: true })
    .click();
  await expect(page.locator(".resume-preview")).toContainText(
    "사용자 흐름을 개선하는 디자이너입니다.",
  );
  await expect(page.locator(".resume-preview")).toContainText(
    "일상을 바꾸는 금융 경험",
  );
  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".document-builder")).toBeHidden();
  await expect(page.locator(".print-sheet .resume-sheet")).toContainText(
    "사용자 흐름을 개선하는 디자이너입니다.",
  );
  await page.screenshot({ path: "test-results/resume-print.png" });
  await page.emulateMedia({ media: "screen" });
  await page.getByRole("button", { name: "작업본 저장", exact: true }).click();
  await page.getByRole("button", { name: "자소서", exact: true }).click();
  await expect(page.getByLabel("문항 답변")).toHaveCount(0);
  await page.getByRole("button", { name: "직무 역량", exact: true }).click();
  await page.getByRole("button", { name: "다음 단계", exact: true }).click();
  await page
    .getByLabel("이 문항에 넣을 핵심 내용")
    .fill("사용자 인터뷰를 하고 핵심 흐름을 정리했습니다.");
  await page.getByRole("button", { name: "다음 단계", exact: true }).click();
  await page.getByLabel("문항 답변").fill("첫 문항의 기존 답변");
  await page.getByRole("button", { name: "협업 경험", exact: true }).click();
  await page.getByRole("button", { name: "다음 단계", exact: true }).click();
  await page.getByRole("button", { name: "다음 단계", exact: true }).click();
  await page
    .getByLabel("문항 답변")
    .fill("다른 문항에 쓴 답변은 유지되어야 합니다.");
  await page.locator(".cover-question-nav button").first().click();
  const inputs: any[] = [];
  await page.route("**/api/ai", (r) => {
    inputs.push(r.request().postDataJSON());
    return r.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        text: "확인된 사용자 인터뷰 경험을 정리한 초안입니다.",
      }),
    });
  });
  await page
    .getByRole("button", { name: "이 문항의 AI 초안 만들기", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "동의하고 제안 받기", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "검토한 제안 반영", exact: true })
    .click();
  await expect(page.getByLabel("문항 답변")).toHaveValue(
    "확인된 사용자 인터뷰 경험을 정리한 초안입니다.",
  );
  await page.locator(".cover-question-nav button").nth(1).click();
  await expect(page.getByLabel("문항 답변")).toHaveValue(
    "다른 문항에 쓴 답변은 유지되어야 합니다.",
  );
  expect(inputs).toHaveLength(1);
  const saved = await (await page.request.get("/api/workspace")).json();
  const cover = saved.state.documents.find(
    (d: any) => d.id === inputs[0].targetId,
  );
  expect(cover.prompts).toHaveLength(2);
  expect(cover.prompts[0].id).toBe(inputs[0].promptId);
  expect(cover.prompts[1].answer).toBe(
    "다른 문항에 쓴 답변은 유지되어야 합니다.",
  );
  await page.reload();
  await nav(page, "이력서 · 자기소개서").click();
  await page.getByRole("button", { name: /마스터 자기소개서/ }).click();
  await page.locator(".cover-question-nav button").nth(1).click();
  await expect(page.getByLabel("문항 답변")).toHaveValue(
    "다른 문항에 쓴 답변은 유지되어야 합니다.",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("focused assessment has readable mobile choices, resumes the unanswered question and analyzes once after completion", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("heading", { name: "지민님, 다음 커리어를 준비해 볼까요?" })
    .waitFor();
  const before = await (await page.request.get("/api/workspace")).json();
  const r = emptyReflection();
  for (const q of allReflectionQuestions)
    if (q.id !== "s6")
      r.answers[q.id] = q.section === "situation" ? q.choices[0].id : 4;
  before.state.reflection = r;
  expect(
    (
      await page.request.put("/api/workspace", {
        headers: { Origin: "http://localhost:3100" },
        data: { state: before.state, revision: before.revision },
      })
    ).status(),
  ).toBe(200);
  const inputs: any[] = [];
  let release!: () => void;
  const gate = new Promise<void>((resolve) => (release = resolve));
  await page.route("**/api/ai", async (route) => {
    inputs.push(route.request().postDataJSON());
    await gate;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        text: "## 나의 업무 성향\n협업을 선호합니다.\n## 경험으로 확인한 어필 역량\n금융 경험에서 사용자 흐름을 개선했습니다.\n## 이력서·자소서·면접 표현 전략\n본인의 기여를 설명하세요.\n## 다음 준비 과제\n직접 확인한 결과를 보완하세요.",
      }),
    });
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/assessment");
  await expect(page.locator("aside.sidebar")).toHaveCount(0);
  const selection = page.locator(".assessment-welcome .experience-chips input");
  const n = await selection.count();
  for (let i = 1; i < n; i++) await selection.nth(i).uncheck();
  await page
    .getByRole("checkbox", {
      name: "외부 AI 전송에 동의하고 완료 후 어필 전략을 받아볼게요.",
      exact: true,
    })
    .check();
  await page
    .getByRole("button", { name: "이어서 점검하기", exact: true })
    .click();
  await expect(page.locator(".reflection-tabs")).toHaveCount(0);
  const text = page
    .locator(".reflection-situation-choices label > span")
    .first();
  const radio = page.locator(".reflection-situation-choices input").first();
  const textBox = await text.boundingBox();
  const radioBox = await radio.boundingBox();
  expect(textBox!.width).toBeGreaterThan(200);
  expect(radioBox!.width).toBeLessThanOrEqual(18);
  expect(textBox!.x).toBeLessThan(100);
  await page.screenshot({ path: "test-results/assessment-choices-mobile.png" });
  await page.getByRole("radio").first().check();
  expect(inputs).toHaveLength(0);
  await expect(page.locator(".strategy-panel")).toHaveCount(0);
  await page
    .getByRole("button", { name: "답변 요약 보기", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: /성향과 경험을 종합 분석하고 있어요/ }),
  ).toBeVisible();
  await expect.poll(() => inputs.length).toBe(1);
  expect(inputs[0].projectIds).toEqual([before.state.projects[0].id]);
  release();
  await expect(page.locator(".reflection-ai")).toContainText(
    "이력서·자소서·면접 표현 전략",
  );
  await expect(page.getByText("답변 저장됨", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.locator(".reflection-ai")).toContainText(
    "사용자 흐름을 개선했습니다.",
  );
  expect(inputs).toHaveLength(1);
  const saved = await (await page.request.get("/api/workspace")).json();
  expect(saved.state.reflection.history).toHaveLength(1);
  expect(saved.state.reflection.analysis.projectIds).toEqual([
    before.state.projects[0].id,
  ]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
