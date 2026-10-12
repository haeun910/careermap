import type { ReflectionAnswers, SelfReflection } from "./types";
export type ReflectionSection = "culture" | "job" | "situation";
export const reflectionSections = [
  {
    id: "culture",
    title: "컬처핏 · 업무 환경",
    description: "내가 편하게 일하는 방식",
    time: "8문항",
  },
  {
    id: "job",
    title: "잡핏 · 직무 선호",
    description: "마음이 가는 업무의 성격",
    time: "8문항",
  },
  {
    id: "situation",
    title: "조직 상황 돌아보기",
    description: "회사에서 나는 어떻게 선택할까?",
    time: "6문항",
  },
] as const;
export const scaleLabels = [
  "전혀 아니에요",
  "아닌 편이에요",
  "상황에 따라 달라요",
  "그런 편이에요",
  "매우 그래요",
];
export interface ScaleQuestion {
  id: string;
  section: "culture" | "job";
  axis: string;
  prompt: string;
  reverse?: boolean;
}
export const scaleQuestions: ScaleQuestion[] = [
  {
    id: "c1",
    section: "culture",
    axis: "autonomy",
    prompt: "목표가 주어지면 구체적인 진행 방법은 스스로 정하는 편이 편합니다.",
  },
  {
    id: "c2",
    section: "culture",
    axis: "autonomy",
    prompt:
      "일의 순서와 판단 기준이 구체적으로 정해져 있을 때 더 편하게 일합니다.",
    reverse: true,
  },
  {
    id: "c3",
    section: "culture",
    axis: "change",
    prompt: "중간에 방향이 바뀌더라도 새로운 방법을 시도할 기회가 반갑습니다.",
  },
  {
    id: "c4",
    section: "culture",
    axis: "change",
    prompt: "예측할 수 있는 일정과 검증된 방법을 유지하는 환경을 선호합니다.",
    reverse: true,
  },
  {
    id: "c5",
    section: "culture",
    axis: "collaboration",
    prompt:
      "생각이 덜 정리됐더라도 팀과 자주 공유하며 함께 방향을 잡고 싶습니다.",
  },
  {
    id: "c6",
    section: "culture",
    axis: "collaboration",
    prompt:
      "혼자 충분히 생각할 시간을 가진 뒤 정리된 의견을 공유하고 싶습니다.",
    reverse: true,
  },
  {
    id: "c7",
    section: "culture",
    axis: "feedback",
    prompt: "작업하는 도중에도 작은 피드백을 자주 받는 방식이 편합니다.",
  },
  {
    id: "c8",
    section: "culture",
    axis: "feedback",
    prompt: "약속한 시점에 묶어서 피드백을 받고 그 사이에는 집중하고 싶습니다.",
    reverse: true,
  },
  {
    id: "j1",
    section: "job",
    axis: "investigate",
    prompt:
      "자료를 비교하고 원인을 파고들어 문제를 설명하는 과정에 흥미가 있습니다.",
  },
  {
    id: "j2",
    section: "job",
    axis: "investigate",
    prompt:
      "여러 가설 중 어떤 설명이 맞는지 근거를 찾아 확인하는 일이 끌립니다.",
  },
  {
    id: "j3",
    section: "job",
    axis: "create",
    prompt:
      "아이디어를 코드, 설계, 글, 디자인 등 눈에 보이는 결과물로 만드는 일이 끌립니다.",
  },
  {
    id: "j4",
    section: "job",
    axis: "create",
    prompt: "도구를 익히고 직접 만들어 보면서 개선하는 과정에 흥미가 있습니다.",
  },
  {
    id: "j5",
    section: "job",
    axis: "people",
    prompt:
      "사람의 요구를 듣고 서로 이해할 수 있도록 설명하거나 조율하는 일이 끌립니다.",
  },
  {
    id: "j6",
    section: "job",
    axis: "people",
    prompt:
      "사용자나 동료와 대화하며 실제로 필요한 것이 무엇인지 알아가는 일이 즐겁습니다.",
  },
  {
    id: "j7",
    section: "job",
    axis: "operate",
    prompt:
      "누락과 오류를 점검하고 일이 안정적으로 돌아가게 만드는 과정에 흥미가 있습니다.",
  },
  {
    id: "j8",
    section: "job",
    axis: "operate",
    prompt:
      "반복되는 업무의 절차를 정리하고 더 효율적으로 운영하는 일이 끌립니다.",
  },
];
export interface SituationChoice {
  id: string;
  label: string;
  approach: string;
  strength: string;
  tradeoff: string;
  followup: string;
}
export interface SituationQuestion {
  id: string;
  section: "situation";
  title: string;
  prompt: string;
  choices: SituationChoice[];
}
const choice = (
  id: string,
  label: string,
  approach: string,
  strength: string,
  tradeoff: string,
  followup: string,
): SituationChoice => ({ id, label, approach, strength, tradeoff, followup });
export const situationQuestions: SituationQuestion[] = [
  {
    id: "s1",
    section: "situation",
    title: "모호한 요청과 가까운 마감",
    prompt:
      "마감은 이틀 뒤인데 요청의 범위가 모호합니다. 팀에서는 우선 진행해 달라고 합니다. 가장 먼저 할 행동은?",
    choices: [
      choice(
        "a",
        "담당자와 성공 기준·필수 범위를 먼저 짧게 확인한다.",
        "기준을 맞춘 뒤 진행",
        "엇갈린 기대와 재작업을 줄이려는 선택입니다.",
        "확인이 길어지면 시작 시간이 줄 수 있습니다.",
        "확인할 수 없는 상황이라면 어떤 가정을 공개하고 시작할까요?",
      ),
      choice(
        "b",
        "가정을 적고 작은 초안을 만들어 빠르게 피드백을 요청한다.",
        "작은 실행으로 확인",
        "구체적인 초안으로 불확실성을 줄이려는 선택입니다.",
        "핵심 가정이 틀리면 일부 작업을 다시 해야 합니다.",
        "어떤 부분을 가장 작고 되돌릴 수 있는 초안으로 만들까요?",
      ),
      choice(
        "c",
        "유사한 사례를 찾아 초안 범위와 확인할 질문을 정리한다.",
        "근거를 찾아 구조화",
        "기존 자료로 문제를 정리하려는 선택입니다.",
        "이전 사례가 현재 상황에 그대로 맞지는 않을 수 있습니다.",
        "과거 사례와 이번 요청의 다른 점은 무엇일까요?",
      ),
      choice(
        "d",
        "팀과 짧게 상의해 역할·우선순위를 나누고 함께 시작한다.",
        "팀과 함께 정렬",
        "팀의 관점과 실행 여력을 모으려는 선택입니다.",
        "의견을 모으는 데 시간이 들고 최종 결정자가 필요합니다.",
        "의견이 모이지 않으면 누가 어떤 기준으로 결정할까요?",
      ),
    ],
  },
  {
    id: "s2",
    section: "situation",
    title: "팀에서 의견이 갈릴 때",
    prompt:
      "같은 문제에 대해 팀원 두 명의 제안이 다릅니다. 어느 쪽이 맞는지 아직 근거가 부족합니다. 어떻게 접근할까요?",
    choices: [
      choice(
        "a",
        "두 제안의 장단점과 결정 기준을 함께 적어 비교한다.",
        "판단 기준 만들기",
        "논의를 공통 기준으로 정리하려는 선택입니다.",
        "기준 자체에 합의하는 과정이 필요합니다.",
        "이번 결정에서 꼭 지켜야 할 기준 하나는 무엇일까요?",
      ),
      choice(
        "b",
        "작은 실험으로 두 제안을 비교할 수 있는지 확인한다.",
        "실험으로 판단",
        "관찰 가능한 결과를 얻으려는 선택입니다.",
        "실험 비용과 결과를 기다릴 시간을 확인해야 합니다.",
        "어떤 결과를 보면 판단을 바꿀 수 있을까요?",
      ),
      choice(
        "c",
        "각자의 우려를 따로 듣고 공통 목표부터 맞춘다.",
        "관점과 관계 이해",
        "의견 뒤의 이유를 이해하려는 선택입니다.",
        "관계 정리 후에도 실질적인 선택은 필요합니다.",
        "공감과 최종 선택을 어떻게 구분해 설명할까요?",
      ),
      choice(
        "d",
        "담당 결정자에게 근거와 쟁점을 정리해 판단을 요청한다.",
        "결정 역할 명확화",
        "책임 있는 결정 경로를 활용하려는 선택입니다.",
        "스스로 판단할 수 있는 범위까지 넘기지 않도록 주의해야 합니다.",
        "내가 먼저 결정할 수 있는 부분은 무엇일까요?",
      ),
    ],
  },
  {
    id: "s3",
    section: "situation",
    title: "동료의 일정이 늦어질 때",
    prompt:
      "동료의 작업이 늦어져 내 일정에도 영향이 생겼습니다. 상대도 다른 업무가 겹쳐 바빠 보입니다. 가장 먼저 할 행동은?",
    choices: [
      choice(
        "a",
        "상대의 막힌 점과 가능한 전달 시점을 확인한다.",
        "상황부터 파악",
        "추측 대신 실제 제약을 확인하려는 선택입니다.",
        "확인한 내용을 일정 조정으로 연결해야 합니다.",
        "새 일정을 누구에게 언제 공유할까요?",
      ),
      choice(
        "b",
        "내가 도울 수 있는 작은 작업이 있는지 제안한다.",
        "직접 지원",
        "팀 전체의 진행을 돕고자 하는 선택입니다.",
        "내 업무와 상대의 책임 범위가 흐려질 수 있습니다.",
        "도움의 범위와 종료 시점을 어떻게 정할까요?",
      ),
      choice(
        "c",
        "전체 일정에 미치는 영향을 정리해 팀과 우선순위를 조정한다.",
        "전체 일정 조율",
        "연쇄적인 영향을 공개하고 조율하려는 선택입니다.",
        "문제 제기가 개인 비난으로 받아들여지지 않도록 맥락이 필요합니다.",
        "개인 평가가 아닌 일정 문제로 어떻게 설명할까요?",
      ),
      choice(
        "d",
        "현재 자료로 진행할 수 있는 부분을 나눠 먼저 시작한다.",
        "의존성 줄이기",
        "멈춰 있는 시간을 줄이려는 선택입니다.",
        "가정이 바뀌면 작업을 수정할 수 있습니다.",
        "나중에 바뀔 가능성이 있는 가정은 무엇일까요?",
      ),
    ],
  },
  {
    id: "s4",
    section: "situation",
    title: "예상과 다른 피드백",
    prompt:
      "충분히 고민한 결과물에 대해 '방향이 다르다'는 피드백을 받았습니다. 구체적인 설명은 아직 없습니다. 다음 행동은?",
    choices: [
      choice(
        "a",
        "기대했던 예시와 가장 중요한 수정 기준을 요청한다.",
        "피드백 구체화",
        "모호한 피드백을 실행 기준으로 바꾸려는 선택입니다.",
        "질문이 방어적으로 들리지 않도록 표현을 살펴야 합니다.",
        "확인하고 싶은 질문을 한 문장으로 말해 볼까요?",
      ),
      choice(
        "b",
        "내 의도와 근거를 짧게 설명하고 다른 해석을 들어본다.",
        "서로의 의도 확인",
        "판단의 배경을 공유하려는 선택입니다.",
        "설명이 기존 결과를 설득하는 데만 머물지 않도록 주의해야 합니다.",
        "어떤 새로운 정보가 오면 내 판단을 바꿀까요?",
      ),
      choice(
        "c",
        "수정 방향 두 가지를 간단히 만들어 비교를 요청한다.",
        "대안으로 대화",
        "추상적인 의견을 구체적인 선택으로 바꾸려는 선택입니다.",
        "기준 없이 대안을 많이 만들면 시간이 늘 수 있습니다.",
        "대안끼리 무엇이 다르게 보이도록 만들까요?",
      ),
      choice(
        "d",
        "피드백을 정리한 뒤 짧은 후속 대화 시간을 잡는다.",
        "정리 후 재논의",
        "감정과 논점을 정리할 시간을 확보하려는 선택입니다.",
        "다시 논의할 시점을 명확히 해야 진행이 멈추지 않습니다.",
        "후속 대화에서 꼭 확인할 핵심은 무엇일까요?",
      ),
    ],
  },
  {
    id: "s5",
    section: "situation",
    title: "기존 방식과 새로운 제안",
    prompt:
      "새로운 방법이 더 효율적일 것 같지만 팀은 기존 방식을 쓰고 있습니다. 아직 개선 효과를 확인하지는 못했습니다. 어떻게 제안할까요?",
    choices: [
      choice(
        "a",
        "문제와 예상 효과를 정리해 먼저 의견을 듣는다.",
        "문제와 기대 정리",
        "변경 이유를 팀이 함께 이해하도록 돕는 선택입니다.",
        "예상 효과와 확인된 효과를 구분해야 합니다.",
        "실제로 확인해야 할 효과는 무엇일까요?",
      ),
      choice(
        "b",
        "영향이 작은 작업에서 시험하고 결과를 공유한다.",
        "작은 시범 적용",
        "변경 위험을 제한하면서 근거를 얻으려는 선택입니다.",
        "시험 범위와 기존 업무에 미치는 영향을 먼저 확인해야 합니다.",
        "실험을 중단할 기준은 무엇일까요?",
      ),
      choice(
        "c",
        "기존 방식을 사용하는 이유와 제약부터 알아본다.",
        "기존 맥락 이해",
        "보이지 않는 제약을 이해하려는 선택입니다.",
        "제약 이해가 개선을 계속 미루는 이유가 되지 않도록 살펴야 합니다.",
        "유지할 부분과 바꿔 볼 부분을 어떻게 나눌까요?",
      ),
      choice(
        "d",
        "변경에 영향을 받는 동료와 적용 조건을 함께 정리한다.",
        "적용 조건 합의",
        "도입 이후의 사용과 운영까지 살피려는 선택입니다.",
        "작은 변경에도 큰 합의 과정을 만들지 않도록 범위를 정해야 합니다.",
        "이번 제안에 꼭 참여해야 할 사람은 누구일까요?",
      ),
    ],
  },
  {
    id: "s6",
    section: "situation",
    title: "두 가지 긴급 업무",
    prompt:
      "서로 다른 담당자가 같은 시간까지 업무를 요청했습니다. 둘 다 중요해 보이지만 함께 끝내기는 어렵습니다. 먼저 무엇을 할까요?",
    choices: [
      choice(
        "a",
        "영향과 마감을 비교해 우선순위·조정안을 제시한다.",
        "영향으로 우선순위 판단",
        "선택의 근거와 현실적인 대안을 만들려는 선택입니다.",
        "담당자에게 판단 근거를 확인받을 필요가 있습니다.",
        "어느 업무를 늦출 때 영향이 더 클까요?",
      ),
      choice(
        "b",
        "관련 담당자에게 현재 상황을 공유하고 우선순위 결정을 요청한다.",
        "충돌을 공개하고 조율",
        "서로 모르는 요청을 드러내고 조율하려는 선택입니다.",
        "단순 전달만 하기보다 가능한 선택지를 준비하면 좋습니다.",
        "함께 제시할 선택지는 무엇일까요?",
      ),
      choice(
        "c",
        "두 업무의 필수 부분과 나중에 할 부분을 나눠 협의한다.",
        "범위를 나눠 협의",
        "제한된 시간에서 핵심 결과를 확보하려는 선택입니다.",
        "핵심 범위가 상대의 기대와 맞는지 확인해야 합니다.",
        "이번 마감에 반드시 필요한 최소 결과는 무엇일까요?",
      ),
      choice(
        "d",
        "팀의 지원 가능성을 확인하고 역할을 나눌 방법을 찾는다.",
        "자원을 함께 활용",
        "개인 시간 외의 해결 방법을 찾으려는 선택입니다.",
        "다른 사람의 일정과 추가 조율 비용도 고려해야 합니다.",
        "도움을 요청할 때 무엇을 명확히 전달할까요?",
      ),
    ],
  },
];
export const allReflectionQuestions = [
  ...scaleQuestions,
  ...situationQuestions,
];
export const reflectionAxes = [
  {
    id: "autonomy",
    section: "culture",
    title: "업무의 자율성",
    low: "명확한 진행 기준",
    high: "방법을 정하는 자율성",
    check: "목표와 진행 방법은 누가, 어떤 방식으로 정하나요?",
  },
  {
    id: "change",
    section: "culture",
    title: "변화와 안정",
    low: "예측 가능한 계획",
    high: "새로운 시도와 변화",
    check: "중간에 업무 방향이나 우선순위가 얼마나 자주 바뀌나요?",
  },
  {
    id: "collaboration",
    section: "culture",
    title: "생각을 나누는 방식",
    low: "정리 후 의견 공유",
    high: "대화하며 함께 정리",
    check: "개인 집중 시간과 협업 시간은 어떻게 배분하나요?",
  },
  {
    id: "feedback",
    section: "culture",
    title: "피드백의 리듬",
    low: "약속한 시점의 피드백",
    high: "진행 중 자주 피드백",
    check: "피드백은 누구에게, 얼마나 자주 받나요?",
  },
  {
    id: "investigate",
    section: "job",
    title: "분석과 탐구",
    low: "다른 업무부터 탐색",
    high: "자료 조사·원인 분석",
    check:
      "자료 조사나 문제 원인 분석이 일에서 차지하는 비중은 어느 정도인가요?",
  },
  {
    id: "create",
    section: "job",
    title: "제작과 구현",
    low: "다른 업무부터 탐색",
    high: "코드·설계·콘텐츠 제작",
    check: "직접 만드는 결과물과 사용하는 도구는 무엇인가요?",
  },
  {
    id: "people",
    section: "job",
    title: "소통과 조율",
    low: "다른 업무부터 탐색",
    high: "사용자 소통·설명·조율",
    check: "고객·사용자·동료와 직접 소통하는 시간이 얼마나 되나요?",
  },
  {
    id: "operate",
    section: "job",
    title: "운영과 개선",
    low: "다른 업무부터 탐색",
    high: "품질 점검·업무 운영",
    check: "반복 업무와 개선 업무의 비중은 어떻게 되나요?",
  },
] as const;
export function emptyReflection(): SelfReflection {
  return { version: 1, answers: {}, notes: {}, updatedAt: "", history: [] };
}
export function validReflectionAnswer(id: string, value: unknown) {
  const scale = scaleQuestions.find((q) => q.id === id);
  if (scale)
    return (
      typeof value === "number" &&
      Number.isInteger(value) &&
      value >= 1 &&
      value <= 5
    );
  const situation = situationQuestions.find((q) => q.id === id);
  return (
    !!situation &&
    typeof value === "string" &&
    situation.choices.some((c) => c.id === value)
  );
}
export function answeredCount(
  answers: ReflectionAnswers["answers"],
  section?: ReflectionSection,
) {
  return allReflectionQuestions.filter(
    (q) =>
      (!section || q.section === section) &&
      validReflectionAnswer(q.id, answers[q.id]),
  ).length;
}
export function reflectionSignature(data: ReflectionAnswers) {
  return JSON.stringify(
    allReflectionQuestions.map((q) => [
      q.id,
      data.answers[q.id] ?? null,
      data.notes[q.id] || "",
    ]),
  );
}
export function reflectionResults(data: ReflectionAnswers) {
  return reflectionAxes.map((axis) => {
    const questions = scaleQuestions.filter((q) => q.axis === axis.id);
    const answered = questions.filter((q) =>
      validReflectionAnswer(q.id, data.answers[q.id]),
    );
    const complete = answered.length === questions.length;
    const values = answered.map((q) =>
      q.reverse ? 6 - Number(data.answers[q.id]) : Number(data.answers[q.id]),
    );
    const mean = complete
      ? values.reduce((a, b) => a + b, 0) / values.length
      : null;
    const preference =
      mean === null
        ? "답변을 더 모아 보세요"
        : mean >= 3.5
          ? axis.high
          : mean <= 2.5
            ? axis.low
            : "상황과 조건에 따라 달라짐";
    const tension = complete && Math.abs(values[0] - values[1]) >= 3;
    return {
      ...axis,
      mean,
      preference,
      complete,
      tension,
      answered: answered.length,
      evidence: answered.map((q) => ({
        id: q.id,
        prompt: q.prompt,
        answer: scaleLabels[Number(data.answers[q.id]) - 1],
      })),
    };
  });
}
export function reflectionEvidence(data: ReflectionAnswers) {
  return allReflectionQuestions
    .filter((q) => validReflectionAnswer(q.id, data.answers[q.id]))
    .map((q) => {
      const answer =
        q.section === "situation"
          ? q.choices.find((c) => c.id === data.answers[q.id])!.label
          : scaleLabels[Number(data.answers[q.id]) - 1];
      return {
        id: q.id,
        section: q.section,
        question: q.prompt,
        answer,
        note: data.notes[q.id] || "",
      };
    });
}
