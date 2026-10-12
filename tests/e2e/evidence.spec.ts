import { test, expect } from "@playwright/test";
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a5AAAAABJRU5ErkJggg==",
  "base64",
);
test("save then attach private photos and PDF, preview/download, reload and remove on mobile", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "내 공간 만들기", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("이름 · 닉네임").fill("첨부 테스트");
  await dialog.getByLabel("목표 직무").fill("서비스 기획자");
  await dialog
    .getByRole("button", { name: "나만의 준비 시작", exact: true })
    .click();
  await page
    .getByRole("button", { name: "프로젝트 추가", exact: true })
    .click();
  await dialog
    .getByRole("button", { name: "직접 작성 · 수정", exact: true })
    .click();
  await dialog.locator("[name=title]").fill("증빙을 모은 경험");
  await dialog
    .getByRole("button", { name: "저장하고 증빙 첨부", exact: true })
    .click();
  await expect(dialog.getByLabel("사진 또는 PDF 첨부")).toBeEnabled();
  await dialog
    .getByLabel("사진 또는 PDF 첨부")
    .setInputFiles({ name: "결과물.png", mimeType: "image/png", buffer: png });
  await expect(dialog.locator(".evidence-list")).toContainText("결과물.png");
  await expect(dialog).toContainText("첨부 자료를 비공개로 저장했습니다.");
  await dialog
    .getByRole("button", { name: "결과물.png 미리보기", exact: true })
    .click();
  await expect(dialog.locator(".evidence-preview img")).toBeVisible();
  expect(
    await dialog
      .locator(".evidence-preview img")
      .evaluate(
        (img: HTMLImageElement) => img.complete && img.naturalWidth > 0,
      ),
  ).toBe(true);
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    dialog
      .getByRole("link", { name: "결과물.png 다운로드", exact: true })
      .click(),
  ]);
  expect(download.suggestedFilename()).toBe("결과물.png");
  await dialog
    .getByLabel("사진 또는 PDF 첨부")
    .setInputFiles({
      name: "수료증.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF\n"),
    });
  await expect(dialog.locator(".evidence-list li")).toHaveCount(2);
  await dialog
    .getByLabel("사진 또는 PDF 첨부")
    .setInputFiles({
      name: "bad.png",
      mimeType: "image/png",
      buffer: Buffer.from("<html>bad</html>"),
    });
  await expect(dialog.locator(".project-evidence [role=alert]")).toContainText(
    "파일 내용과 형식",
  );
  await expect(dialog.locator(".evidence-list li")).toHaveCount(2);
  await dialog.getByRole("button", { name: "닫기", exact: true }).click();
  await page.reload();
  await page.locator("aside.sidebar nav").getByRole("button", {name:"프로젝트 · 경험", exact:true}).click();
  await page
    .getByRole("heading", { name: "증빙을 모은 경험", exact: true })
    .locator("..")
    .getByRole("button", { name: "편집", exact: false })
    .click();
  await expect(dialog.locator(".evidence-list li")).toHaveCount(2);
  await page.setViewportSize({ width: 390, height: 844 });
  await dialog.locator(".project-evidence").scrollIntoViewIfNeeded();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await dialog
    .getByRole("button", { name: "결과물.png 삭제", exact: true })
    .click();
  await dialog.getByRole("button", { name: "유지", exact: true }).click();
  await expect(dialog.locator(".evidence-list li")).toHaveCount(2);
  await dialog
    .getByRole("button", { name: "결과물.png 삭제", exact: true })
    .click();
  await dialog.getByRole("button", { name: "첨부 삭제", exact: true }).click();
  await expect(dialog.locator(".evidence-list li")).toHaveCount(1);
  await dialog
    .getByRole("button", { name: "수료증.pdf 삭제", exact: true })
    .click();
  await dialog.getByRole("button", { name: "첨부 삭제", exact: true }).click();
  await expect(dialog.locator(".evidence-list li")).toHaveCount(0);
});
