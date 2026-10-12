import { getAiProvider } from "./ai-provider";
import type { AiTask, Workspace } from "./types";
import {
  reflectionEvidence,
  reflectionResults,
  emptyReflection,
} from "./reflection";
export function aiContext(
  s: Workspace,
  task: AiTask,
  targetId?: string,
  answer?: string,
  question?: string,
) {
  if (task === "project")
    throw new Error("프로젝트 초안에는 짧은 경험 답변이 필요합니다.");
  if (task === "reflection") {
    const reflection = s.reflection || emptyReflection();
    return {
      instruction:
        "질문 답변을 바탕으로 한국어 자기성찰 요약을 작성하세요. 업무 환경 선호, 탐색할 업무, 상황별 선택의 장점과 고려할 점, 실제 기업에 확인할 질문 3개를 정리하세요. 각 해석에 답변 ID와 실제 답변 근거를 연결하세요. 답변은 자기보고와 가상 상황 선택일 뿐입니다. 성격·역량·건강 진단, 검증된 심리검사라고 주장하기, 기업 적합도 점수·합격 확률·정답 판정은 금지합니다. 상반된 답변은 상황 의존 가능성으로 설명하세요. 미응답 항목과 전공·준비 유형만으로 사람을 추정하지 마세요. 선호와 실제 역량을 구분하고 작은 경험으로 확인할 행동을 제안하세요.",
      data: {
        profile: {
          type: s.profile.type,
          background: s.profile.background,
          role: s.profile.role,
        },
        reflection: reflectionEvidence(reflection),
        projects: [],
        company: null,
        job: null,
        document: null,
        submitted: [],
        preferences: reflectionResults(reflection)
          .filter((r) => r.complete)
          .map((r) => ({
            area: r.title,
            preference: r.preference,
            tension: r.tension,
          })),
      },
    };
  }
  const job = s.jobs.find((j) => j.id === targetId);
  const company = s.companies.find((c) => c.id === job?.companyId);
  const doc = s.documents.find((d) => d.id === targetId);
  const submittedDocs = s.documents.filter(
    (d) => d.jobId === job?.id && d.submitted,
  );
  const useSubmitted =
    ["questions", "feedback"].includes(task) && submittedDocs.length > 0;
  const selectedJob = useSubmitted
    ? submittedDocs[0].submitted!.jobSnapshot
    : doc
      ? s.jobs.find((j) => j.id === doc.jobId)
      : job;
  const selectedCompany = doc
    ? s.companies.find((c) => c.id === selectedJob?.companyId)
    : company;
  const ids = doc?.projectIds || selectedJob?.projectIds;
  const sourceProjects = useSubmitted
    ? Array.from(
        new Map(
          submittedDocs
            .flatMap((d) => d.submitted!.projectSnapshots)
            .map((p) => [p.id, p]),
        ).values(),
      )
    : s.projects;
  const projects =
    task === "company"
      ? []
      : (ids && !useSubmitted
          ? sourceProjects.filter((p) => ids.includes(p.id))
          : sourceProjects
        )
          .slice(0, 4)
          .map(({ privateNote, link, ...p }) => p);
  const profile = {
    type: s.profile.type,
    background: s.profile.background,
    role: s.profile.role,
  };
  const submitted = s.documents
    .filter((d) => useSubmitted && d.jobId === selectedJob?.id && d.submitted)
    .map((d) => ({ kind: d.kind, text: d.submitted!.text }));
  const instructions: Record<
    Exclude<AiTask, "reflection" | "project">,
    string
  > = {
    self: "경험에 근거한 SWOT 분석을 작성하세요. 강점/보완점/기회/위협과 경험 근거, 다음 준비 과제 3개를 제공하세요. 진단이나 합격 확률은 제시하지 마세요.",
    company:
      "등록한 기업 소개와 공고만 분석하세요. 사업 맥락, 담당 업무, 필수/우대 역량, 확인되지 않은 정보, 서류 준비 포인트를 정리하세요. 제공된 URL을 직접 읽었다고 주장하지 마세요.",
    match:
      "공고의 요구 역량별로 연결되는 프로젝트와 구체적인 근거를 설명하세요. 자료 부족과 보완할 역량을 구분하고 준비 과제 3개를 제안하세요.",
    resume:
      doc?.kind === "경력기술서"
        ? "선택한 업무 경험을 기반으로 경력기술서 초안을 작성하세요. 회사·직무·기간, 담당 범위와 프로젝트별 개인 기여·실행·성과를 구조화하세요. 회사 등 입력 자료에 없는 정보는 [직접 입력]으로 남기고 가상의 경력을 만들지 마세요."
        : "선택한 경험을 기반으로 이력서 초안을 작성하세요. 프로필 요약, 주요 역량, 프로젝트별 역할·행동·성과를 포함하세요. 연락처나 가상의 학력·회사는 만들지 마세요.",
    cover: `자기소개서 문항에 답하는 초안을 작성하세요. 선택한 실제 경험만 활용하고 확인된 직무 요구와 연결하세요. 준비 유형이나 전공 배경만으로 대학 재학·졸업 여부, 경험 시기, 회사 경력, 개인 가치관을 추정하지 마세요. 기업 설명에 없는 기업 문화·가치·전략을 사실로 쓰지 마세요. 누락된 사실을 꾸며 쓰는 대신 확인된 경험과 직무 요구만으로 구성하세요. 답변 본문만 일반 텍스트로 출력하세요. 제목, Markdown 형식, 분석, 글자수 계산, 설명, 체크리스트, 검토 안내를 절대 덧붙이지 마세요. 필요한 정보는 [직접 입력]으로 남기세요. ${doc?.limit ? `공백과 줄바꿈을 포함하여 반드시 ${doc.limit}자 이하로 작성하세요. 여유를 두어 약 ${Math.floor(doc.limit * 0.7)}자를 목표로 간결하게 작성하세요.` : "간결하게 3~4개 문단으로 작성하세요."}`,
    questions:
      "제출본이 있으면 제출본을 우선하고 경험과 공고를 기반으로 면접 예상 질문 5개와 답변 구성 힌트를 작성하세요. 실제 기출이 아닌 예상 질문이라고 표시하세요. 각 질문은 반드시 ### Q1. 질문, ### Q2. 질문 형식의 제목으로 시작하고 그 아래 답변 힌트를 작성하세요.",
    feedback:
      "현재 질문과 답변을 평가하세요. 구체성, 논리, 직무 관련성, 경험 근거를 짚고 좋은 점·보완점·개선 예시를 주세요. 마지막에 이 답변의 모호한 부분을 확인하는 후속 질문 1개를 제시하세요. 텍스트만으로 목소리나 표정을 평가하지 마세요.",
  };
  return {
    instruction:
      instructions[task] +
      (!selectedJob &&
      ["questions", "feedback", "resume", "cover"].includes(task)
        ? " 특정 기업이나 공고가 없는 마스터 준비 자료입니다. 목표 직무와 실제 경험만 활용하세요. 기업 정보·문화·회사와의 적합도를 추정하지 마세요. 경험이 없으면 일반적인 예상 질문과 직접 채울 답변 구조를 제공하세요."
        : ""),
    data: {
      profile,
      company: selectedCompany
        ? {
            name: selectedCompany.name,
            overview: selectedCompany.overview,
            website: selectedCompany.website,
          }
        : null,
      job: selectedJob
        ? {
            title: selectedJob.title,
            description: selectedJob.description,
            source: selectedJob.source,
          }
        : null,
      projects,
      document: doc
        ? {
            kind: doc.kind,
            question: doc.question,
            limit: doc.limit,
            text: doc.text,
          }
        : null,
      submitted,
      ...(task === "questions" && !targetId
        ? {
            masterDocuments: s.documents
              .filter((d) => !d.jobId)
              .slice(0, 3)
              .map((d) => ({ kind: d.kind, text: d.text.slice(0, 3000) })),
          }
        : {}),
      question,
      answer,
    },
  };
}
export async function generate(
  task: AiTask,
  context: ReturnType<typeof aiContext>,
) {
  return getAiProvider().generate({
    task,
    instruction: context.instruction,
    data: context.data,
  });
}
