export type View =
  | "dashboard"
  | "self"
  | "projects"
  | "companies"
  | "documents"
  | "interview"
  | "portfolio";
export type Stage =
  "관심" | "준비 중" | "지원 완료" | "면접 진행" | "결과 확정";
export interface Profile {
  name: string;
  type: string;
  background: string;
  role: string;
  bio: string;
}
export interface Project {
  id: string;
  title: string;
  category: string;
  period: string;
  role: string;
  problem: string;
  action: string;
  result: string;
  learning: string;
  tags: string[];
  link: string;
  privateNote: string;
}
export interface Company {
  id: string;
  name: string;
  industry: string;
  color: string;
  overview: string;
  website: string;
  priority: string;
}
export interface Job {
  id: string;
  companyId: string;
  title: string;
  deadline: string;
  status: Stage;
  description: string;
  source: string;
  projectIds: string[];
  analysis: string;
  analyzedAt: string;
  matchAnalysis?: string;
}
export interface Document {
  id: string;
  jobId: string;
  kind: "이력서" | "자기소개서" | "경력기술서";
  title: string;
  question: string;
  limit: number;
  text: string;
  projectIds: string[];
  versions: { id: string; text: string; date: string }[];
  submitted?: {
    text: string;
    date: string;
    projectSnapshots: Project[];
    jobSnapshot: Job;
  };
}
export interface Task {
  id: string;
  text: string;
  done: boolean;
  category: string;
  jobId: string;
  deadline: string;
}
export interface Question {
  id: string;
  jobId: string;
  question: string;
  answer: string;
  sourceDocumentId: string;
}
export interface Practice {
  id: string;
  jobId: string;
  date: string;
  question: string;
  answer: string;
  feedback: string;
}
export interface Portfolio {
  title: string;
  subtitle: string;
  about: string;
  projectIds: string[];
  email: string;
  showEmail: boolean;
  projectOverrides: Record<string, { title: string; result: string }>;
}
export interface Workspace {
  profile: Profile;
  projects: Project[];
  companies: Company[];
  jobs: Job[];
  documents: Document[];
  tasks: Task[];
  questions: Question[];
  practices: Practice[];
  selfAnalysis: string;
  portfolio: Portfolio;
}
export interface Publication {
  slug: string;
  updatedAt: string;
}
export interface WorkspaceResponse {
  state: Workspace;
  revision: number;
  guest: boolean;
  publication: Publication | null;
}
export type AiTask =
  "self" | "company" | "match" | "resume" | "cover" | "questions" | "feedback";
export const uid = () => crypto.randomUUID();
export const stages: Stage[] = [
  "관심",
  "준비 중",
  "지원 완료",
  "면접 진행",
  "결과 확정",
];
export function safeUrl(value: string) {
  try {
    const u = new URL(value);
    return ["https:", "http:"].includes(u.protocol) ? u.href : "";
  } catch {
    return "";
  }
}
export function progress(state: Workspace, job: Job) {
  const docs = state.documents.filter((d) => d.jobId === job.id);
  const checks = [
    job.projectIds.length > 0,
    Boolean(job.analysis),
    docs.some((d) => d.text.trim()),
    docs.some((d) => d.submitted),
    state.questions.some((q) => q.jobId === job.id && q.answer.trim()),
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}
