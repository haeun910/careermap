import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import Markdown from "../components/markdown";
const table =
  "## SWOT 분석 (경험 근거 기반)\n\n| 구분 | 내용 | 경험 근거 |\n|---|---|---|\n| **강점** | 라즈베리파이와 YOLO 모델 적용<br>실제 연동 경험 | 본인이 작성한 코드 |\n| **보완점** | 클라우드 운영 경험 확인 필요<br />학습 계획 정리 | 아직 등록된 근거 없음 |";
test("stored GFM tables and bare HTML line breaks render as cells and breaks, including fenced Markdown responses", () => {
  for (const text of [table, "```markdown\n" + table + "\n```"]) {
    const html = renderToStaticMarkup(createElement(Markdown, { text }));
    assert.ok(html.includes("<table>"));
    assert.ok(html.includes("<th>구분</th>"));
    assert.ok(html.includes("<strong>강점</strong>"));
    assert.ok(html.includes("적용<br/>실제 연동 경험"));
    assert.ok(html.includes("필요<br/>학습 계획"));
    assert.ok(!html.includes("&lt;br"));
    assert.ok(!html.includes("|---|"));
    assert.ok(!html.includes("<pre>"));
  }
});
test("analysis formatting supports lists and safe links while excluding scripts, executable HTML and remote images", () => {
  const html = renderToStaticMarkup(
    createElement(Markdown, {
      text:
        table +
        '\n\n- 확인된 경험\n- 다음 준비 과제\n\n<script>window.__markdownXss=1</script>\n\n<img src="https://example.invalid/track" onerror="alert(1)">\n\n![외부 이미지](https://example.invalid/image.png)\n\n[위험](javascript:alert(1)) [공식 자료](https://example.com)',
    }),
  );
  assert.ok(html.includes("<ul>"));
  assert.ok(html.includes("<li>확인된 경험</li>"));
  assert.ok(!html.includes("<script"));
  assert.ok(!html.includes("window.__markdownXss"));
  assert.ok(!html.includes("<img"));
  assert.ok(!html.includes('href="javascript:'));
  assert.ok(html.includes('href="https://example.com/"'));
  assert.ok(html.includes('rel="noopener noreferrer"'));
  const code = renderToStaticMarkup(
    createElement(Markdown, { text: '```python\nprint("example")\n```' }),
  );
  assert.ok(code.includes("<pre>"));
});
