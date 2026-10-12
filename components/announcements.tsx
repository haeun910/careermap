"use client";
import { useState, useEffect } from "react";
import {
  Megaphone,
  Pin,
  Plus,
  Eye,
  Save,
  Trash2,
  ArrowRight,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Button, Modal, Field, Spinner, Empty } from "./ui";
import { safeUrl } from "@/lib/types";
import type { Announcement } from "@/lib/types";
async function request<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const response = await fetch(path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error || "요청을 완료하지 못했습니다.");
  return data;
}
const date = (value: string) =>
  new Date(value).toLocaleDateString("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
function Content({ text }: { text: string }) {
  return (
    <div className="markdown notice-content">
      <ReactMarkdown
        components={{
          a: ({ href, children }) => (
            <a href={safeUrl(href || "")} target="_blank" rel="noreferrer">
              {children}
            </a>
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
export function AnnouncementBoard({
  summary = false,
  onOpen,
}: {
  summary?: boolean;
  onOpen?: () => void;
}) {
  const [items, setItems] = useState<Announcement[] | null>(null),
    [error, setError] = useState("");
  async function load() {
    setError("");
    try {
      setItems(
        (await request<{ announcements: Announcement[] }>("/api/announcements"))
          .announcements,
      );
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    load();
  }, []);
  if (summary) {
    if (!items?.length) return null;
    return (
      <section className="notice-summary">
        <Megaphone size={19} />
        <span className="label-pill">이음 소식</span>
        <button onClick={onOpen}>
          {items[0].pinned && <Pin size={12} />}
          <strong>{items[0].title}</strong>
          <ArrowRight size={15} />
        </button>
      </section>
    );
  }
  return (
    <div className="announcements-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">NEWS FROM IEUM</span>
          <h1>이음 소식</h1>
          <p>새로운 기능과 서비스 이용 안내를 확인하세요.</p>
        </div>
        <Button variant="secondary" onClick={load}>
          <RefreshCw size={14} />
          새로고침
        </Button>
      </div>
      {error ? (
        <div className="panel">
          <p className="form-error" role="alert">
            {error}
          </p>
          <Button variant="secondary" onClick={load}>
            다시 불러오기
          </Button>
        </div>
      ) : items === null ? (
        <div className="panel">
          <Spinner /> 공지를 불러오고 있어요.
        </div>
      ) : items.length ? (
        <div className="notice-list">
          {items.map((item) => (
            <details className="panel notice-card" key={item.id}>
              <summary>
                <div>
                  <span className="notice-meta">
                    {item.pinned && (
                      <span className="notice-pin">
                        <Pin size={12} />
                        주요 공지
                      </span>
                    )}
                    <time>{date(item.publishedAt || item.updatedAt)}</time>
                  </span>
                  <h2>{item.title}</h2>
                </div>
                <span className="notice-expand">내용 보기</span>
              </summary>
              <Content text={item.body} />
            </details>
          ))}
        </div>
      ) : (
        <section className="panel">
          <Empty
            icon={<Megaphone size={30} />}
            title="아직 등록된 공지가 없어요"
            description="이음의 새 소식과 이용 안내가 올라오면 이곳에서 확인할 수 있어요."
          />
        </section>
      )}
    </div>
  );
}
export function AnnouncementAdministration({
  onOpenPublic,
}: {
  onOpenPublic: () => void;
}) {
  const [items, setItems] = useState<Announcement[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [active, setActive] = useState(""),
    [title, setTitle] = useState(""),
    [body, setBody] = useState(""),
    [pinned, setPinned] = useState(false);
  const [preview, setPreview] = useState(false),
    [remove, setRemove] = useState(false),
    [message, setMessage] = useState(""),
    [switchTo, setSwitchTo] = useState<string | null>(null);
  const selected = items.find((x) => x.id === active);
  const dirty = selected
    ? title !== selected.title ||
      body !== selected.body ||
      pinned !== selected.pinned
    : !!title || !!body || pinned;
  async function load() {
    setLoading(true);
    setError("");
    try {
      setItems(
        (
          await request<{ announcements: Announcement[] }>(
            "/api/admin/announcements",
          )
        ).announcements,
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);
  function select(id: string) {
    const item = items.find((x) => x.id === id);
    setActive(id);
    setTitle(item?.title || "");
    setBody(item?.body || "");
    setPinned(item?.pinned || false);
    setPreview(false);
    setMessage("");
    setError("");
  }
  function choose(id: string) {
    if (id && id === active) return;
    if (dirty) {
      setSwitchTo(id);
      return;
    }
    select(id);
  }
  async function save(published: boolean) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await request<{ announcement: Announcement }>(
        "/api/admin/announcements",
        active ? "PATCH" : "POST",
        {
          ...(active ? { id: active, revision: selected?.revision } : {}),
          announcement: { title, body, pinned, published },
        },
      );
      const item = result.announcement;
      setItems((prev) => [item, ...prev.filter((x) => x.id !== item.id)]);
      setActive(item.id);
      setTitle(item.title);
      setBody(item.body);
      setPinned(item.pinned);
      setMessage(
        item.published
          ? "공지가 게시됐습니다. 이음 소식에서 확인할 수 있어요."
          : "공지 초안을 저장했습니다. 방문자에게는 보이지 않습니다.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function deleteItem() {
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      await request("/api/admin/announcements", "DELETE", {
        id: selected.id,
        revision: selected.revision,
      });
      setItems((prev) => prev.filter((x) => x.id !== selected.id));
      select("");
      setRemove(false);
      setMessage("공지를 삭제했습니다.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="admin-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">IEUM ADMIN</span>
          <h1>관리자 모드</h1>
          <p>공지 초안을 작성하고 방문자에게 안내할 내용을 게시하세요.</p>
        </div>
        <Button variant="secondary" onClick={onOpenPublic}>
          <Eye size={15} />
          이음 소식 보기
        </Button>
      </div>
      <div className="admin-access-note">
        <ShieldCheck size={18} />
        <p>서버에서 지정한 관리자 계정만 공지를 관리할 수 있습니다.</p>
      </div>
      <div className="announcement-workspace">
        <aside className="panel announcement-sidebar">
          <Button disabled={busy} onClick={() => choose("")}>
            <Plus size={15} />새 공지 작성
          </Button>
          <h2>
            공지 목록 <small>{items.length}</small>
          </h2>
          {loading ? (
            <Spinner />
          ) : items.length ? (
            items.map((item) => (
              <button
                disabled={busy}
                key={item.id}
                className={"notice-nav " + (active === item.id ? "active" : "")}
                onClick={() => choose(item.id)}
              >
                <span>
                  {item.published ? "게시 중" : "초안"}
                  {item.pinned && " · 상단 고정"}
                </span>
                <strong>{item.title}</strong>
                <small>{date(item.updatedAt)}</small>
              </button>
            ))
          ) : (
            <p className="helper-text">첫 공지 초안부터 작성해 보세요.</p>
          )}
          <p className="helper-text">최근 100개의 공지를 보여줍니다.</p>
        </aside>
        <section className="panel announcement-editor">
          <div className="announcement-editor-heading">
            <h2>
              {selected
                ? selected.published
                  ? "게시 중인 공지 수정"
                  : "저장된 초안 수정"
                : "새 공지"}
            </h2>
            <span className="label-pill">
              {selected?.published ? "방문자에게 공개 중" : "초안 · 비공개"}
            </span>
          </div>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          {message && (
            <p className="notice-feedback" role="status">
              {message}
            </p>
          )}
          <Field label="공지 제목" hint="160자 이내">
            <input
              maxLength={160}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={busy}
            />
          </Field>
          <Field
            label="공지 본문"
            hint="10,000자 이내 · 줄바꿈과 간단한 Markdown을 사용할 수 있어요."
          >
            <textarea
              rows={15}
              maxLength={10000}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              disabled={busy}
            />
          </Field>
          <label className="notice-pin-control">
            <input
              type="checkbox"
              checked={pinned}
              onChange={(e) => setPinned(e.target.checked)}
              disabled={busy}
            />
            공지 목록 상단에 고정
          </label>
          <div className="announcement-editor-actions">
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => setPreview(true)}
            >
              <Eye size={15} />
              미리보기
            </Button>
            <Button
              variant="secondary"
              disabled={busy || !title.trim()}
              onClick={() => save(false)}
            >
              <Save size={15} />
              {selected?.published ? "공개 해제하고 저장" : "초안 저장"}
            </Button>
            <Button
              disabled={busy || !title.trim() || !body.trim()}
              onClick={() => save(true)}
            >
              <Megaphone size={15} />
              {selected?.published ? "게시 내용 저장" : "공지 게시"}
            </Button>
            {selected && (
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() => setRemove(true)}
              >
                <Trash2 size={14} />
                삭제
              </Button>
            )}
          </div>
          <p className="helper-text">
            게시 버튼을 누르면 방문자가 내용을 볼 수 있습니다. 초안은 관리자만
            볼 수 있어요.
          </p>
        </section>
      </div>
      {preview && (
        <Modal
          title={title || "공지 미리보기"}
          subtitle="게시 전 내용을 확인하세요."
          wide
          onClose={() => setPreview(false)}
        >
          <Content text={body || "아직 본문이 없습니다."} />
          <div className="modal-actions">
            <Button variant="secondary" onClick={() => setPreview(false)}>
              작성으로 돌아가기
            </Button>
          </div>
        </Modal>
      )}
      {remove && selected && (
        <Modal
          title="이 공지를 삭제할까요?"
          subtitle={selected.title}
          onClose={() => {
            if (!busy) setRemove(false);
          }}
        >
          <p className="body-copy">
            본문과 저장된 공지를 삭제합니다. 삭제한 공지는 복구할 수 없어요.
          </p>
          <div className="modal-actions">
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => setRemove(false)}
            >
              유지하기
            </Button>
            <Button variant="danger" disabled={busy} onClick={deleteItem}>
              공지 삭제
            </Button>
          </div>
        </Modal>
      )}
      {switchTo !== null && (
        <Modal
          title="저장하지 않은 변경 사항이 있어요"
          onClose={() => setSwitchTo(null)}
        >
          <p className="body-copy">
            현재 수정 내용을 먼저 저장하거나, 변경을 버리고 다른 공지를 열 수
            있어요.
          </p>
          <div className="modal-actions">
            <Button variant="secondary" onClick={() => setSwitchTo(null)}>
              계속 작성
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                select(switchTo);
                setSwitchTo(null);
              }}
            >
              변경을 버리고 이동
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
