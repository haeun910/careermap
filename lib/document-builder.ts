import type { Profile, Project, Document } from "./types";
export interface ResumeEntry {
  id: string;
  projectId?: string;
  title: string;
  detail: string;
  period: string;
  description: string;
}
export interface ResumeData {
  name: string;
  email: string;
  phone: string;
  headline: string;
  summary: string;
  skills: string;
  portfolio: string;
  education: ResumeEntry[];
  career: ResumeEntry[];
  experiences: ResumeEntry[];
  credentials: ResumeEntry[];
}
export interface CoverPrompt {
  id: string;
  question: string;
  limit: number;
  notes: string;
  answer: string;
  projectIds: string[];
}
export const coverTemplates = [
  {
    title: "지원동기",
    question:
      "이 직무에 지원한 이유와 이를 준비하기 위해 기울인 노력을 작성해 주세요.",
  },
  {
    title: "직무 역량",
    question: "지원 직무와 관련된 경험을 바탕으로 본인의 강점을 설명해 주세요.",
  },
  {
    title: "문제 해결",
    question:
      "어려운 문제를 해결한 경험과 본인의 역할, 그 과정에서 배운 점을 작성해 주세요.",
  },
  {
    title: "협업 경험",
    question:
      "다른 사람과 함께 목표를 달성한 경험과 본인의 기여를 설명해 주세요.",
  },
  {
    title: "입사 후 목표",
    question:
      "입사 후 맡고 싶은 업무와 이를 위해 발전시키고 싶은 역량을 작성해 주세요.",
  },
];
export function emptyResume(profile: Profile): ResumeData {
  return {
    name: profile.name,
    email: "",
    phone: "",
    headline: profile.role,
    summary: "",
    skills: "",
    portfolio: "",
    education: [],
    career: [],
    experiences: [],
    credentials: [],
  };
}
export function experienceEntry(project: Project): ResumeEntry {
  return {
    id: crypto.randomUUID(),
    projectId: project.id,
    title: project.title,
    detail: project.role,
    period: project.period,
    description: [project.problem, project.action, project.result]
      .filter(Boolean)
      .join("\n"),
  };
}
export function formatResume(r: ResumeData) {
  const sections = [
    [r.name, r.headline].filter(Boolean).join(" | "),
    [r.email, r.phone, r.portfolio].filter(Boolean).join(" · "),
    r.summary && "소개\n" + r.summary,
    r.skills && "보유 역량\n" + r.skills,
    ...(
      [
        ["학력", r.education],
        ["경력", r.career],
        ["프로젝트 · 활동", r.experiences],
        ["자격 · 수상 · 교육", r.credentials],
      ] as const
    ).map(([title, entries]) =>
      entries.length
        ? title +
          "\n" +
          entries
            .map((e) =>
              [
                [e.title, e.detail, e.period].filter(Boolean).join(" | "),
                e.description,
              ]
                .filter(Boolean)
                .join("\n"),
            )
            .join("\n\n")
        : "",
    ),
  ];
  return sections.filter(Boolean).join("\n\n");
}
export function formatCover(prompts: CoverPrompt[]) {
  return prompts
    .filter((p) => p.question.trim())
    .map((p, i) => `${i + 1}. ${p.question}\n\n${p.answer}`)
    .join("\n\n");
}
export function coverReady(prompts: CoverPrompt[]) {
  return (
    prompts.length > 0 &&
    prompts.every(
      (p) =>
        p.question.trim() &&
        p.answer.trim() &&
        (!p.limit || p.answer.length <= p.limit),
    )
  );
}
export function legacyPrompts(doc: Document): CoverPrompt[] {
  return (
    doc.prompts ??
    (doc.question || doc.text
      ? [
          {
            id: crypto.randomUUID(),
            question: doc.question,
            limit: doc.limit,
            notes: "",
            answer: doc.text,
            projectIds: [...doc.projectIds],
          },
        ]
      : [])
  );
}
export function resumeAiEvidence(r: ResumeData) {
  // Contact information and name never leave the editor through an AI request.
  const entries = (items: ResumeEntry[]) =>
    items
      .slice(0, 3)
      .map((e) => ({ ...e, description: e.description.slice(0, 800) }));
  return {
    headline: r.headline,
    summary: r.summary.slice(0, 600),
    skills: r.skills.slice(0, 1000),
    education: entries(r.education),
    career: entries(r.career),
    experiences: entries(r.experiences),
    credentials: entries(r.credentials),
  };
}

export function aiDocumentText(doc: Document, text = doc.text) {
  const resume = doc.submitted?.resume || doc.resume;
  if (!resume) return text;
  if (text === formatResume(resume))
    return formatResume({
      ...resume,
      name: "",
      email: "",
      phone: "",
      portfolio: "",
    });
  return [resume.email, resume.phone, resume.portfolio]
    .filter(Boolean)
    .reduce((result, value) => result.split(value).join(""), text);
}
