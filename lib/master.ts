import { uid } from "./types";
import type { Workspace, Document, Question } from "./types";
export function copyDocumentToSpace(
  state: Workspace,
  source: Document,
  jobId: string,
): Document {
  const job = state.jobs.find((j) => j.id === jobId);
  if (jobId && !job) throw new Error("복사할 공고를 확인해 주세요.");
  const company = state.companies.find((c) => c.id === job?.companyId);
  return {
    ...structuredClone(source),
    id: uid(),
    jobId,
    title: (company?.name || "마스터") + " " + source.kind,
    text: source.submitted?.text ?? source.text,
    submitted: undefined,
    versions: [],
  };
}
export function copyQuestionToSpace(
  state: Workspace,
  source: Question,
  jobId: string,
): Question {
  if (jobId && !state.jobs.some((j) => j.id === jobId))
    throw new Error("복사할 공고를 확인해 주세요.");
  return { ...structuredClone(source), id: uid(), jobId, sourceDocumentId: "" };
}
