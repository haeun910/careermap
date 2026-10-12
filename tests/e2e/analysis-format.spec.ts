import { test, expect } from "@playwright/test";
import {
  allReflectionQuestions,
  emptyReflection,
  reflectionSignature,
} from "../../lib/reflection";
import { experienceSignature } from "../../lib/strategy";
const table =
  "## SWOT 분석 (경험 근거 기반)\n\n| 구분 | 내용 | 경험 근거 |\n|---|---|---|\n| **강점** | 라즈베리파이와 YOLO 모델 적용<br>실제 연동 경험 | 본인이 작성한 코드 |\n| **보완점** | 클라우드 운영 경험 확인 필요<br />학습 계획 정리 | 아직 등록된 근거 없음 |";
test("existing SWOT, company, fit, interview and assessment results render tables without raw markup on desktop and mobile", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("heading", { name: "지민님, 다음 커리어를 준비해 볼까요?" })
    .waitFor();
  const before = await (await page.request.get("/api/workspace")).json();
  const state = before.state;
  state.selfAnalysis = table;
  state.jobs[0].analysis = "```markdown\n" + table + "\n```";
  state.jobs[0].matchAnalysis = table;
  state.practices.push({
    id: "markdown-practice",
    jobId: state.jobs[0].id,
    date: new Date().toISOString(),
    question: "실제 경험을 소개해 주세요.",
    answer: "정리한 경험을 설명했습니다.",
    feedback: table,
  });
  const r = emptyReflection();
  for (const q of allReflectionQuestions)
    r.answers[q.id] = q.section === "situation" ? q.choices[0].id : 4;
  r.analysis = {
    text: table,
    source: reflectionSignature(r),
    date: new Date().toISOString(),
    projectIds: [state.projects[0].id],
    experienceSource: experienceSignature(state.projects, [
      state.projects[0].id,
    ]),
  };
  state.reflection = r;
  expect(
    (
      await page.request.put("/api/workspace", {
        headers: { Origin: "http://localhost:3100" },
        data: { state, revision: before.revision },
      })
    ).status(),
  ).toBe(200);
  await page.reload();
  const nav = (name: string) =>
    page
      .locator("aside.sidebar nav")
      .getByRole("button", { name, exact: true })
      .click();
  await nav("자기분석");
  await expect(page.locator(".markdown table")).toHaveCount(1);
  await expect(page.locator(".markdown td br")).toHaveCount(2);
  await expect(page.locator(".markdown")).not.toContainText("<br>");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator(".markdown").scrollIntoViewIfNeeded();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "test-results/swot-table-mobile.png" });
  await page.setViewportSize({ width: 1440, height: 1050 });
  await nav("희망기업");
  await page
    .locator(".job-list-row")
    .filter({ hasText: state.jobs[0].title })
    .first()
    .click();
  await page
    .getByRole("button", { name: "기업 · 맞춤 분석", exact: true })
    .click();
  await expect(page.locator(".markdown table")).toHaveCount(2);
  await expect(page.locator(".markdown pre")).toHaveCount(0);
  await nav("면접 준비");
  await page
    .getByRole("combobox", { name: "준비할 지원 공간" })
    .selectOption(state.jobs[0].id);
  await page.getByRole("button", { name: /연습 기록/ }).click();
  await page.locator(".practice-history summary").first().click();
  await expect(page.locator(".practice-history .markdown table")).toHaveCount(
    1,
  );
  await page.goto("/assessment");
  await expect(page.locator(".reflection-ai table")).toHaveCount(1);
  await expect(page.locator(".reflection-ai")).not.toContainText("<br>");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator(".reflection-ai").scrollIntoViewIfNeeded();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
