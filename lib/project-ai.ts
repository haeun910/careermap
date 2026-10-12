import { z } from "zod";
import { getAiProvider } from "./ai-provider";
import {
  parseProjectDraft,
  projectDraftContext,
  projectDraftSchema,
  draftFields,
  sourceLabels,
} from "./project-draft";
import type { ProjectInput } from "./project-draft";

export async function generateProjectDraft(input: ProjectInput) {
  const instruction = [
    "짧은 실제 경험 답변을 프로젝트 기록 초안으로 정리하세요. 격식 있는 한국어로 읽기 쉽게 다듬되 사용자가 말하지 않은 문제·행동·성과·배운 점·기간·직책·기술은 만들지 마세요.",
    "경험 유형만으로 개인 기여·경력을 추정하지 마세요. 모르겠다는 답변은 사실 근거로 사용하지 마세요. role에는 직무명을 추측하지 말고 사용자가 직접 했다고 말한 기여를 간단하게 정리하세요.",
    "확인할 수 없는 항목은 빈 문자열로 남기세요. 결과가 없으면 action을 성과로 확대하거나 가상의 성공을 쓰지 마세요. 수치와 도구 이름은 입력에 나온 표기를 그대로 사용하세요.",
    "problem에는 입력에서 확인한 활동 배경·시작점·목표를 정리하세요. 문제가 따로 없는 활동이면 about에 적힌 활동 배경을 표현하고, 없던 문제나 동기는 만들지 마세요.",
    "부족한 핵심 사실에 대해 답하기 쉬운 보완 질문을 2~3개 만드세요. contribution이 비었고 additional에도 개인 기여가 없으면 첫 질문은 action 항목에서 본인이 직접 맡은 일을 묻습니다. 결과가 없으면 result에서 실제 확인한 변화, 배운 점이 없으면 learning에서 개인적으로 배운 점을 묻습니다. 이미 충분히 답한 내용은 반복해서 묻지 말고, 모두 확인되었다면 질문을 생략해도 됩니다. 수치나 상황을 미리 가정하지 말고 수치가 없어도 답할 수 있게 하세요.",
    'Markdown이나 설명 없이 JSON 객체 하나만 반환하세요. 정확한 구조: {"draft":{"title":"짧은 경험 제목","role":"","problem":"","action":"","result":"","learning":"","tags":[]},"sources":{"title":["about"],"role":[],"problem":[],"action":[],"result":[],"learning":[]},"questions":[]}',
    "sources의 각 키는 해당 문장의 실제 근거인 experience 필드 ID 목록입니다. about, contribution, outcome, additional 중 내용이 있는 답변만 인용하세요. 모든 비어 있지 않은 문장에는 적어도 하나의 근거를 연결하세요. title은 200자, role은 200자, 나머지 항목은 각각 3000자 이내의 간결한 1~3문장으로 작성하세요. tags에는 입력에 실제로 적힌 도구·역량 이름만 최대 12개 넣으세요. questions의 field는 title, role, problem, action, result, learning 중 하나입니다. 질문은 각각 200자 이내입니다.",
  ].join("\n");
  const { $schema, ...responseSchema } = z.toJSONSchema(projectDraftSchema);
  const sources = responseSchema.properties?.sources;
  const available = Object.keys(sourceLabels).filter((id) =>
    input[id as keyof typeof sourceLabels].trim(),
  );
  if (sources && typeof sources === "object") {
    for (const field of draftFields) {
      const property = sources.properties?.[field];
      if (property && typeof property === "object") {
        const items = property.items;
        if (items && typeof items === "object" && !Array.isArray(items))
          items.enum = available;
      }
    }
  }
  const result = await getAiProvider().generate({
    task: "project",
    instruction,
    data: projectDraftContext(input),
    responseSchema,
  });
  const parsed = parseProjectDraft(result.text, input);
  return {
    ...parsed,
    provider: result.provider,
    model: result.model,
    task: result.task,
    createdAt: result.createdAt,
  };
}
