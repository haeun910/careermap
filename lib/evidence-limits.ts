export const EVIDENCE_FILE_LIMIT = 2 * 1024 * 1024;
export const EVIDENCE_USER_LIMIT = 20 * 1024 * 1024;
export const EVIDENCE_PROJECT_LIMIT = 10;
export const EVIDENCE_ACCEPT = ".png,.jpg,.jpeg,.webp,.pdf";
export type EvidenceFile = {
  id: string;
  name: string;
  mime: string;
  size: number;
  createdAt: string;
};
export function evidenceUrl(projectId: string, id: string) {
  return `/api/projects/${encodeURIComponent(projectId)}/evidence/${encodeURIComponent(id)}`;
}
export function fileSize(size: number) {
  return size < 1024 * 1024
    ? `${Math.ceil(size / 1024)} KB`
    : `${(size / 1024 / 1024).toFixed(1)} MB`;
}
