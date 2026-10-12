"use client";
import { useEffect, useRef, useState } from "react";
import {
  Paperclip,
  Upload,
  Download,
  FileText,
  LockKeyhole,
  Trash2,
  X,
} from "lucide-react";
import { Button, Spinner } from "./ui";
import {
  EVIDENCE_ACCEPT,
  EVIDENCE_FILE_LIMIT,
  EVIDENCE_PROJECT_LIMIT,
  evidenceUrl,
  fileSize,
  type EvidenceFile,
} from "@/lib/evidence-limits";

export default function ProjectEvidence({
  projectId,
  saved,
  disabled,
  onBusyChange,
}: {
  projectId: string;
  saved: boolean;
  disabled: boolean;
  onBusyChange: (busy: boolean) => void;
}) {
  const [files, setFiles] = useState<EvidenceFile[]>([]);
  const [used, setUsed] = useState(0);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState("");
  const [deleting, setDeleting] = useState("");
  const [confirm, setConfirm] = useState("");
  const [preview, setPreview] = useState<EvidenceFile | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const controller = useRef<AbortController | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const root = `/api/projects/${encodeURIComponent(projectId)}/evidence`;
  async function readFiles(signal: AbortSignal) {
    const response = await fetch(root, { cache: "no-store", signal });
    const body = await response.json();
    if (!response.ok)
      throw new Error(body.error || "첨부 자료를 불러오지 못했습니다.");
    setFiles(body.files);
    setUsed(body.used);
  }
  useEffect(() => {
    if (!saved) return;
    const abort = new AbortController();
    setLoading(true);
    readFiles(abort.signal)
      .catch((e) => {
        if (!abort.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
    // The project ID and saved flag determine which private list is requested.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, saved]);
  useEffect(() => () => controller.current?.abort(), []);
  const busy = !!uploading || !!deleting;
  async function upload(file?: File) {
    if (!file) return;
    setError("");
    setMessage("");
    if (file.size > EVIDENCE_FILE_LIMIT || !file.size) {
      setError(
        "파일은 비어 있지 않아야 하며, 한 개당 2 MB까지 첨부할 수 있습니다.",
      );
      if (input.current) input.current.value = "";
      return;
    }
    const abort = new AbortController();
    controller.current = abort;
    setUploading(file.name);
    onBusyChange(true);
    try {
      const data = new FormData();
      data.append("file", file);
      const response = await fetch(root, {
        method: "POST",
        body: data,
        signal: abort.signal,
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "업로드하지 못했습니다.");
      // Keep the successfully saved item visible even if a list refresh fails.
      setFiles((items) => [...items, body.file]);
      setUsed((size) => size + body.file.size);
      setMessage("첨부 자료를 비공개로 저장했습니다.");
    } catch (e) {
      if (!abort.signal.aborted) setError((e as Error).message);
    } finally {
      if (!abort.signal.aborted) {
        setUploading("");
        onBusyChange(false);
        if (input.current) input.current.value = "";
      }
    }
  }
  async function remove(file: EvidenceFile) {
    const abort = new AbortController();
    controller.current = abort;
    setDeleting(file.id);
    onBusyChange(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(evidenceUrl(projectId, file.id), {
        method: "DELETE",
        signal: abort.signal,
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "삭제하지 못했습니다.");
      setFiles((items) => items.filter((item) => item.id !== file.id));
      setUsed((size) => Math.max(0, size - file.size));
      setConfirm("");
      if (preview?.id === file.id) setPreview(null);
      setMessage("첨부 자료를 삭제했습니다.");
    } catch (e) {
      if (!abort.signal.aborted) setError((e as Error).message);
    } finally {
      if (!abort.signal.aborted) {
        setDeleting("");
        onBusyChange(false);
      }
    }
  }
  return (
    <section className="project-evidence" aria-labelledby="evidence-title">
      <div className="evidence-heading">
        <div>
          <h3 id="evidence-title">
            <Paperclip size={18} /> 경험 증빙 자료
          </h3>
          <p>결과물 화면, 활동 사진, 수료증을 경험과 함께 모아 두세요.</p>
        </div>
        <span className="evidence-private">
          <LockKeyhole size={13} /> 나만 보기
        </span>
      </div>
      <p className="evidence-note">
        첨부 파일은 AI 요청·공개 포트폴리오·지원 서류에 자동으로 포함되지
        않습니다.
      </p>
      {!saved ? (
        <div className="evidence-empty">
          아래 <strong>저장하고 증빙 첨부</strong>를 누르면 바로 파일을 올릴 수
          있어요.
        </div>
      ) : (
        <>
          <div className="evidence-upload">
            <Upload size={22} />
            <div>
              <label htmlFor="evidence-upload-input">사진 또는 PDF 첨부</label>
              <p>PNG · JPG · WebP · PDF / 파일당 2 MB / 경험당 10개</p>
              <input
                ref={input}
                id="evidence-upload-input"
                type="file"
                accept={EVIDENCE_ACCEPT}
                disabled={
                  disabled ||
                  busy ||
                  loading ||
                  files.length >= EVIDENCE_PROJECT_LIMIT
                }
                onChange={(e) => void upload(e.target.files?.[0])}
              />
            </div>
          </div>
          <div className="evidence-capacity">
            <span>이 경험 {files.length} / 10개</span>
            <span>내 공간 전체 {fileSize(used)} / 20 MB</span>
          </div>
          {loading && (
            <p role="status">
              <Spinner /> 첨부 자료를 불러오고 있어요.
            </p>
          )}
          {uploading && (
            <p role="status" className="evidence-progress">
              <Spinner /> {uploading} 업로드 중…
            </p>
          )}
          {!loading && !files.length && (
            <p className="evidence-empty">
              아직 첨부한 자료가 없어요. 기억을 뒷받침할 첫 자료를 올려 보세요.
            </p>
          )}
          <ul className="evidence-list">
            {files.map((file) => (
              <li key={file.id}>
                {file.mime.startsWith("image/") ? (
                  <button
                    type="button"
                    className="evidence-thumbnail"
                    aria-label={`${file.name} 미리보기`}
                    onClick={() => setPreview(file)}
                  >
                    <img
                      src={evidenceUrl(projectId, file.id) + "?preview=1"}
                      alt=""
                      loading="lazy"
                    />
                  </button>
                ) : (
                  <span className="evidence-file-icon">
                    <FileText size={26} />
                  </span>
                )}
                <div className="evidence-file-info">
                  <strong>{file.name}</strong>
                  <small>
                    {fileSize(file.size)} ·{" "}
                    {new Date(file.createdAt).toLocaleDateString("ko-KR")}
                  </small>
                </div>
                <div className="evidence-file-actions">
                  <a
                    className="icon-btn"
                    href={evidenceUrl(projectId, file.id)}
                    download
                    aria-label={`${file.name} 다운로드`}
                  >
                    <Download size={17} />
                  </a>
                  <button
                    className="icon-btn"
                    type="button"
                    disabled={disabled || busy}
                    aria-label={`${file.name} 삭제`}
                    onClick={() => setConfirm(file.id)}
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
                {confirm === file.id && (
                  <div className="evidence-delete-confirm">
                    <p>이 첨부를 삭제할까요? 파일을 복구할 수 없습니다.</p>
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={busy}
                      onClick={() => setConfirm("")}
                    >
                      유지
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      disabled={busy}
                      onClick={() => void remove(file)}
                    >
                      {deleting === file.id && <Spinner />}첨부 삭제
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
          {preview && (
            <div className="evidence-preview">
              <div>
                <strong>{preview.name}</strong>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label="사진 미리보기 닫기"
                  onClick={() => setPreview(null)}
                >
                  <X size={18} />
                </button>
              </div>
              <img
                src={evidenceUrl(projectId, preview.id) + "?preview=1"}
                alt={preview.name}
              />
            </div>
          )}
        </>
      )}
      {error && (
        <div className="form-error" role="alert">
          {error}
          {saved && !busy && (
            <Button
              variant="ghost"
              type="button"
              onClick={() => {
                const abort = new AbortController();
                setError("");
                void readFiles(abort.signal).catch((e) => setError(e.message));
              }}
            >
              목록 다시 불러오기
            </Button>
          )}
        </div>
      )}
      {message && (
        <p role="status" className="evidence-success">
          {message}
        </p>
      )}
    </section>
  );
}
