"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  LayoutDashboard,
  ScanFace,
  FolderKanban,
  Building2,
  FileText,
  MessageSquare,
  Globe,
  ArrowUpRight,
  ArrowRight,
  Plus,
  Search,
  ChevronDown,
  ChevronRight,
  Check,
  CheckCheck,
  CalendarDays,
  Target,
  MoreHorizontal,
  BriefcaseBusiness,
  Layers,
  Clock3,
  Sparkles,
  Route,
  Compass,
  Settings2,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  Copy,
  ExternalLink,
  LogOut,
  Save,
  History,
  Send,
  Eye,
  Trash2,
  GripVertical,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  NotebookPen,
  GraduationCap,
  Code2,
  X,
  LockKeyhole,
  Link as LinkIcon,
  ShieldCheck,
  Loader2,
  BookOpen,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import {
  Button,
  Modal,
  Field,
  Empty,
  Spinner,
  SectionTitle,
  CompanyLogo,
  TextLink,
} from "./ui";
import PortfolioView from "./portfolio-view";
import PreparationGuide from "./preparation-guide";
import SelfReflectionPanel from "./self-reflection";
import { emptyReflection, reflectionSignature } from "@/lib/reflection";
import { copyDocumentToSpace, copyQuestionToSpace } from "@/lib/master";
import { portfolioSnapshot } from "@/lib/portfolio";
import { emptyWorkspace } from "@/lib/seed";
import { uid, stages, progress, safeUrl } from "@/lib/types";
import type {
  Workspace,
  WorkspaceResponse,
  View,
  Project,
  Company,
  Job,
  Document,
  AiTask,
  Question,
} from "@/lib/types";
const menus: { id: View; name: string; icon: typeof Compass }[] = [
  { id: "dashboard", name: "대시보드", icon: LayoutDashboard },
  { id: "guide", name: "준비 가이드", icon: BookOpen },
  { id: "self", name: "자기분석", icon: ScanFace },
  { id: "projects", name: "프로젝트 · 경험", icon: FolderKanban },
  { id: "companies", name: "희망기업", icon: Building2 },
  { id: "documents", name: "이력서 · 자기소개서", icon: FileText },
  { id: "interview", name: "면접 준비", icon: MessageSquare },
  { id: "portfolio", name: "내 포트폴리오", icon: Globe },
];
const dates = (d: string) =>
  d
    ? new Date(d + "T00:00:00+09:00").toLocaleDateString("ko-KR", {
        month: "long",
        day: "numeric",
      })
    : "일정 미정";
const dday = (d: string) => {
  if (!d) return "상시";
  const now = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Seoul",
  });
  const days = Math.round(
    (new Date(d).getTime() - new Date(now).getTime()) / 86400000,
  );
  return days < 0 ? "마감" : days === 0 ? "오늘 마감" : `D-${days}`;
};
async function api<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const r = await fetch(path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const b = await r.json();
  if (!r.ok) throw new Error(b.error || "요청을 완료하지 못했습니다.");
  return b;
}
function Markdown({ text }: { text: string }) {
  return (
    <div className="markdown">
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
export default function WorkspaceApp() {
  const [data, setData] = useState<WorkspaceResponse | null>(null);
  const ref = useRef<WorkspaceResponse | null>(null);
  const revision = useRef(0);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const saveErrorRef = useRef("");
  const [saveError, setSaveError] = useState("");
  const [view, setView] = useState<View>("dashboard");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [toast, setToast] = useState("");
  const [saveCount, setSaveCount] = useState(0);
  const [loadError, setLoadError] = useState("");
  const [modal, setModal] = useState<
    | "project"
    | "company"
    | "job"
    | "task"
    | "profile"
    | "auth"
    | "onboard"
    | "search"
    | "preview"
    | "ai"
    | "aiConsent"
    | "confirmPublish"
    | null
  >(null);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [editCompany, setEditCompany] = useState<Company | null>(null);
  const [activeJob, setActiveJob] = useState("");
  const [companyTab, setCompanyTab] = useState<
    "overview" | "analysis" | "documents" | "interview"
  >("overview");
  const [editJob, setEditJob] = useState<Job | null>(null);
  const [selfEditing, setSelfEditing] = useState(false);
  const [selfDraft, setSelfDraft] = useState("");
  const aiConsent = useRef(false);
  const pendingAi = useRef<(() => Promise<void>) | null>(null);
  const [activeDoc, setActiveDoc] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiResult, setAiResult] = useState("");
  const [aiLimit, setAiLimit] = useState(0);
  const [aiAction, setAiAction] = useState<(() => void) | null>(null);
  const [search, setSearch] = useState("");
  const notify = useCallback((s: string) => setToast(s), []);
  const load = useCallback(async () => {
    try {
      const d = await api<WorkspaceResponse>("/api/workspace");
      ref.current = d;
      revision.current = d.revision;
      setData(d);
      setLoadError("");
    } catch (e) {
      setLoadError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(t);
  }, [toast]);
  const go = (v: View) => {
    setView(v);
    setMobileMenu(false);
  };
  function mutate(fn: (s: Workspace) => Workspace) {
    if (!ref.current) return Promise.resolve();
    const state = fn(structuredClone(ref.current.state));
    const next = { ...ref.current, state };
    ref.current = next;
    setData(next);
    setSaveCount((c) => c + 1);
    const operation = queue.current.then(async () => {
      const r = await api<{ revision: number }>("/api/workspace", "PUT", {
        state,
        revision: revision.current,
      });
      revision.current = r.revision;
      saveErrorRef.current = "";
      setSaveError("");
      if (ref.current) ref.current = { ...ref.current, revision: r.revision };
    });
    queue.current = operation
      .catch((e) => {
        saveErrorRef.current = (e as Error).message;
        setSaveError(saveErrorRef.current);
        notify(saveErrorRef.current);
      })
      .finally(() => setSaveCount((c) => Math.max(0, c - 1)));
    return operation;
  }
  function current() {
    return ref.current!.state;
  }
  async function runAI(
    task: AiTask,
    targetId?: string,
    answer?: string,
    question?: string,
    onApply?: (text: string) => void,
  ) {
    if (!aiConsent.current) {
      pendingAi.current = () =>
        runAI(task, targetId, answer, question, onApply);
      setModal("aiConsent");
      return;
    }
    if (aiBusy) return;
    setAiBusy(true);
    setAiResult("");
    setAiLimit(
      task === "cover"
        ? current().documents.find((d) => d.id === targetId)?.limit || 0
        : 0,
    );
    setModal("ai");
    setAiAction(null);
    try {
      await queue.current;
      if (saveErrorRef.current)
        throw new Error(
          "먼저 저장 오류를 해결해 주세요. " + saveErrorRef.current,
        );
      const r = await api<{ text: string }>("/api/ai", "POST", {
        task,
        targetId,
        answer,
        question,
      });
      setAiResult(r.text);
      if (onApply) setAiAction(() => () => onApply(r.text));
    } catch (e) {
      setAiResult("");
      notify((e as Error).message);
      setModal(null);
    } finally {
      setAiBusy(false);
    }
  }
  if (!data)
    return (
      <main className="boot">
        <div className="brand">
          <span className="brand-icon">
            <Route size={23} />
          </span>
          careermap<span className="brand-dot">.</span>
        </div>
        {loadError ? (
          <>
            <p>{loadError}</p>
            <Button onClick={load}>다시 연결하기</Button>
          </>
        ) : (
          <>
            <Spinner />
            <p>나의 커리어 공간을 준비하고 있어요.</p>
          </>
        )}
      </main>
    );
  const s = data.state;
  const selectedJob = s.jobs.find((j) => j.id === activeJob);
  const selectedCompany = s.companies.find(
    (c) => c.id === selectedJob?.companyId,
  );
  const today = new Date().toLocaleDateString("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "long",
    day: "numeric",
    weekday: "long",
  });
  const pending = s.tasks.filter((t) => !t.done);
  const complete = s.tasks.filter((t) => t.done).length;
  const close = () => setModal(null);
  function openProject(p: Project | null = null) {
    setEditProject(p);
    setModal("project");
  }
  function openCompany(c: Company | null = null) {
    setEditCompany(c);
    setModal("company");
  }
  function openJob(j: Job) {
    setActiveJob(j.id);
    setCompanyTab("overview");
    go("companies");
  }
  function newDocument(jobId: string, kind: Document["kind"]) {
    const doc: Document = {
      id: uid(),
      jobId,
      kind,
      title:
        (jobId
          ? s.companies.find(
              (c) => c.id === s.jobs.find((j) => j.id === jobId)?.companyId,
            )?.name || ""
          : "마스터") +
        " " +
        kind,
      question:
        kind === "자기소개서"
          ? "지원동기와 직무 관련 경험을 작성해 주세요."
          : "",
      limit: kind === "자기소개서" ? 700 : 0,
      text: "",
      projectIds: jobId
        ? [...(s.jobs.find((j) => j.id === jobId)?.projectIds || [])]
        : s.projects.map((p) => p.id),
      versions: [],
    };
    mutate((w) => ({ ...w, documents: [...w.documents, doc] }));
    setActiveDoc(doc.id);
    go("documents");
  }
  const isSample = data.guest && s.projects.some((p) => p.id === "p1");
  const recentProjects = s.projects.slice(0, 2);
  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileMenu ? "sidebar-open" : ""}`}>
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            go("dashboard");
          }}
        >
          <span className="brand-icon">
            <Route size={22} />
          </span>
          careermap<span className="brand-dot">.</span>
        </a>
        <div className="workspace-chip">
          <span className="workspace-avatar">{s.profile.name.charAt(0)}</span>
          <div>
            <strong>나의 커리어 공간</strong>
            <small>
              {s.profile.type} · {s.profile.role || "직무 탐색 중"}
            </small>
          </div>
          <button
            className="icon-btn"
            aria-label="프로필 설정"
            onClick={() => setModal("profile")}
          >
            <ChevronDown size={16} />
          </button>
        </div>
        <span className="nav-label">MY WORKSPACE</span>
        <nav>
          {menus.map((m) => (
            <button
              key={m.id}
              aria-label={m.name}
              aria-current={view === m.id ? "page" : undefined}
              className={`nav-item ${view === m.id ? "active" : ""}`}
              onClick={() => go(m.id)}
            >
              <m.icon size={19} strokeWidth={view === m.id ? 2 : 1.7} />
              <span>{m.name}</span>
              {m.id === "companies" && s.companies.length > 0 && (
                <small>{s.companies.length}</small>
              )}
              {m.id === "portfolio" && <span className="tiny-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-tip">
            <span className="tip-icon">
              <Sparkles size={17} />
            </span>
            <strong>경험이 쌓이면, 가능성도 커져요.</strong>
            <p>
              작은 경험도 기록해 보세요.
              <br />
              나만의 이야기가 됩니다.
            </p>
            <button onClick={() => openProject()}>
              경험 기록하기 <ArrowUpRight size={14} />
            </button>
          </div>
          <button className="nav-item" onClick={() => setModal("profile")}>
            <Settings2 size={18} />
            프로필 설정
          </button>
          <div className="sidebar-user">
            <span className="user-avatar">{s.profile.name.charAt(0)}</span>
            <div>
              <strong>{s.profile.name}님</strong>
              <small>
                {data.guest
                  ? isSample
                    ? "샘플 체험 공간"
                    : "임시 작업 공간"
                  : "개인 작업 공간"}
              </small>
            </div>
            <button
              className="icon-btn"
              aria-label={data.guest ? "로그인" : "로그아웃"}
              onClick={() => {
                if (data.guest) setModal("auth");
                else
                  queue.current
                    .then(() => api("/api/auth", "POST", { action: "logout" }))
                    .then(load)
                    .catch((e) => notify(e.message));
              }}
            >
              {data.guest ? <ArrowUpRight size={17} /> : <LogOut size={16} />}
            </button>
          </div>
        </div>
      </aside>
      {mobileMenu && (
        <div className="mobile-overlay" onClick={() => setMobileMenu(false)} />
      )}
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-btn mobile-only"
              aria-label="메뉴 열기"
              onClick={() => setMobileMenu(true)}
            >
              <Menu size={21} />
            </button>
            <span>나의 커리어 공간</span>
            <ChevronRight size={13} />
            <strong>{menus.find((m) => m.id === view)?.name}</strong>
          </div>
          <div className="topbar-actions">
            <button
              className="search-trigger"
              onClick={() => setModal("search")}
            >
              <Search size={17} />
              <span>무엇을 찾고 있나요?</span>
              <kbd>검색</kbd>
            </button>
            <span className="save-status">
              {saveError ? (
                <button
                  title={saveError}
                  onClick={() => mutate((w) => w).catch(() => {})}
                >
                  <AlertCircle size={14} />
                  저장 실패 · 다시 시도
                </button>
              ) : saveCount ? (
                <>
                  <Loader2 size={12} className="spin" />
                  저장 중
                </>
              ) : (
                <>
                  <CheckCheck size={14} />
                  저장됨
                </>
              )}
            </span>
            <button
              className="top-avatar"
              aria-label="프로필 보기"
              onClick={() => setModal("profile")}
            >
              {s.profile.name.charAt(0)}
            </button>
          </div>
        </header>
        <main className={`main-content view-${view}`}>
          {view === "guide" && (
            <PreparationGuide
              state={s}
              isSample={isSample}
              guest={data.guest}
              onNavigate={go}
              onProfile={() => setModal("profile")}
              onStart={() => setModal("onboard")}
            />
          )}
          {view === "dashboard" && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">
                    <span className="live-dot" />
                    YOUR NEXT CHAPTER
                  </div>
                  <h1>{s.profile.name}님, 다음 커리어를 준비해 볼까요?</h1>
                  <p>
                    지금의 경험이 다음 기회로 이어지도록, 한 걸음씩 함께해요.
                  </p>
                </div>
                <div className="date-chip">
                  <CalendarDays size={16} />
                  {today}
                </div>
              </div>
              {isSample && (
                <div className="demo-strip">
                  <span>
                    <span className="demo-badge">샘플 체험</span>프로젝트와
                    공고는 예시입니다. 나만의 준비를 시작해 보세요.
                  </span>
                  <button onClick={() => setModal("onboard")}>
                    내 공간 만들기 <ArrowRight size={14} />
                  </button>
                </div>
              )}
              <section className="guide-entry">
                <BookOpen size={22} />
                <div>
                  <strong>어디서부터 시작할지 막막한가요?</strong>
                  <p>공고 없이도 시작하는 7단계 준비 가이드를 만나보세요.</p>
                </div>
                <Button variant="secondary" onClick={() => go("guide")}>
                  처음 시작하는 준비 가이드
                  <ArrowRight size={15} />
                </Button>
              </section>
              <section className="hero-card">
                <div className="hero-copy">
                  <span className="hero-label">
                    <Compass size={15} />
                    나만의 커리어 로드맵
                  </span>
                  <h2>
                    흩어져 있던 경험을,
                    <br />
                    하나의 가능성으로.
                  </h2>
                  <p>
                    프로젝트부터 지원 서류, 면접, 포트폴리오까지.
                    <br />내 이야기를 연결하고 다음 목표를 향해 나아가세요.
                  </p>
                  <Button className="hero-btn" onClick={() => openProject()}>
                    경험 정리하러 가기
                    <ArrowUpRight size={17} />
                  </Button>
                </div>
                <div className="roadmap-art" aria-hidden="true">
                  <div className="orbit orbit-one" />
                  <div className="orbit orbit-two" />
                  <span className="roadmap-label">MY CAREER JOURNEY</span>
                  <svg className="roadmap-path" viewBox="0 0 460 220">
                    <path
                      d="M30 172 L145 172 Q185 172 185 133 L185 104 Q185 65 225 65 L347 65 Q395 65 395 20"
                      fill="none"
                      stroke="#5e857e"
                      strokeWidth="2"
                      strokeDasharray="5 6"
                    />
                  </svg>
                  <div className="map-node node-one">
                    <span>
                      <FolderKanban size={22} />
                    </span>
                    <strong>나의 경험</strong>
                    <small>가능성의 시작</small>
                  </div>
                  <div className="map-node node-two">
                    <span>
                      <FileText size={23} />
                    </span>
                    <strong>지원 준비</strong>
                    <small>나만의 이야기</small>
                  </div>
                  <div className="map-node node-three">
                    <span>
                      <Target size={25} />
                    </span>
                    <strong>다음 커리어</strong>
                    <small>새로운 기회</small>
                  </div>
                  <div className="map-you">
                    <span className="live-dot" />
                    YOU ARE HERE
                  </div>
                  <span className="art-spark spark-one">✦</span>
                  <span className="art-spark spark-two">✧</span>
                </div>
              </section>
              <div className="stats-grid">
                {[
                  {
                    label: "정리한 프로젝트",
                    count: s.projects.length,
                    unit: "개",
                    icon: FolderKanban,
                    color: "green",
                    hint: "차곡차곡 쌓이는 나의 경험",
                    action: () => go("projects"),
                  },
                  {
                    label: "희망 기업",
                    count: s.companies.length,
                    unit: "곳",
                    icon: Building2,
                    color: "blue",
                    hint: "나와 함께 성장할 다음 회사",
                    action: () => go("companies"),
                  },
                  {
                    label: "준비 중인 지원",
                    count: s.jobs.filter((j) => j.status === "준비 중").length,
                    unit: "건",
                    icon: Send,
                    color: "purple",
                    hint: "기회에 한 발 더 가까이",
                    action: () => go("companies"),
                  },
                  {
                    label: "완료한 준비",
                    count: complete,
                    unit: "개",
                    icon: CheckCheck,
                    color: "gold",
                    hint: "오늘도 조금씩 앞으로",
                    action: () => setModal("task"),
                  },
                ].map((item) => (
                  <button
                    className="stat-card"
                    key={item.label}
                    onClick={item.action}
                  >
                    <span className={`stat-icon ${item.color}`}>
                      <item.icon size={21} />
                    </span>
                    <span className="stat-label">{item.label}</span>
                    <div className="stat-number">
                      {String(item.count).padStart(2, "0")}
                      <span>{item.unit}</span>
                    </div>
                    <p>{item.hint}</p>
                    <ArrowUpRight className="stat-arrow" size={16} />
                  </button>
                ))}
              </div>
              <div className="dashboard-columns">
                <div className="dashboard-left">
                  <section className="panel tasks-panel">
                    <SectionTitle
                      title="오늘의 준비"
                      description="작은 완료가 모여, 다음 기회를 만듭니다."
                      action={
                        <Button
                          variant="ghost"
                          onClick={() => setModal("task")}
                        >
                          <Plus size={16} />할 일 추가
                        </Button>
                      }
                    />
                    <div className="task-progress">
                      <div>
                        <span>나의 준비 체크리스트</span>
                        <strong>
                          {complete}
                          <small> / {s.tasks.length} 완료</small>
                        </strong>
                      </div>
                      <div className="progress-track">
                        <span
                          style={{
                            width: `${s.tasks.length ? (complete / s.tasks.length) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                    <div className="task-list">
                      {s.tasks.length ? (
                        s.tasks.slice(0, 5).map((t) => (
                          <div
                            className={`task-row ${t.done ? "done" : ""}`}
                            key={t.id}
                          >
                            <button
                              className="task-check"
                              aria-label={`${t.text} ${t.done ? "완료 취소" : "완료"}`}
                              onClick={() =>
                                mutate((w) => ({
                                  ...w,
                                  tasks: w.tasks.map((x) =>
                                    x.id === t.id ? { ...x, done: !x.done } : x,
                                  ),
                                }))
                              }
                            >
                              {t.done && <Check size={13} />}
                            </button>
                            <div>
                              <strong>{t.text}</strong>
                              <span>
                                {s.companies.find(
                                  (c) =>
                                    c.id ===
                                    s.jobs.find((j) => j.id === t.jobId)
                                      ?.companyId,
                                )?.name || "나의 커리어"}
                              </span>
                            </div>
                            <span
                              className={`tag-category ${t.category === "프로젝트" ? "green" : t.category === "기업분석" ? "blue" : "purple"}`}
                            >
                              {t.category}
                            </span>
                            <button
                              className="icon-btn task-delete"
                              aria-label={`${t.text} 삭제`}
                              onClick={() =>
                                mutate((w) => ({
                                  ...w,
                                  tasks: w.tasks.filter((x) => x.id !== t.id),
                                }))
                              }
                            >
                              <X size={13} />
                            </button>
                          </div>
                        ))
                      ) : (
                        <Empty
                          icon={<CheckCheck size={25} />}
                          title="작은 목표부터 시작해요"
                          description="오늘 끝내고 싶은 준비를 하나 추가해 보세요."
                        />
                      )}
                    </div>
                  </section>
                  <section className="panel companies-panel">
                    <SectionTitle
                      title="관심 있는 다음 기회"
                      description="희망 기업에 맞춰, 나의 경험을 연결해 보세요."
                      action={
                        <TextLink onClick={() => go("companies")}>
                          전체 보기
                        </TextLink>
                      }
                    />
                    <div className="company-cards">
                      {s.jobs.slice(0, 3).map((j) => {
                        const c = s.companies.find(
                          (c) => c.id === j.companyId,
                        )!;
                        return (
                          <button
                            className="company-card"
                            key={j.id}
                            onClick={() => openJob(j)}
                          >
                            <div className="company-card-top">
                              <CompanyLogo name={c.name} color={c.color} />
                              <span
                                className={`deadline ${dday(j.deadline) === "마감" ? "muted" : ""}`}
                              >
                                {dday(j.deadline)}
                              </span>
                            </div>
                            <h3>{c.name}</h3>
                            <p>{j.title}</p>
                            <span
                              className={`status-badge ${j.status === "지원 완료" ? "blue" : ""}`}
                            >
                              {j.status}
                            </span>
                            <div className="company-card-footer">
                              <span>준비 진행률</span>
                              <strong>{progress(s, j)}%</strong>
                            </div>
                            <div className="progress-track">
                              <span style={{ width: `${progress(s, j)}%` }} />
                            </div>
                          </button>
                        );
                      })}
                      {!s.jobs.length && (
                        <Empty
                          icon={<Building2 size={24} />}
                          title="첫 희망기업을 등록해요"
                          description="지원하고 싶은 기업과 공고를 모아 보세요."
                          action={
                            <Button onClick={() => openCompany()}>
                              <Plus size={15} />
                              기업 추가
                            </Button>
                          }
                        />
                      )}
                    </div>
                  </section>
                </div>
                <div className="dashboard-right">
                  <section className="panel journey-panel">
                    <SectionTitle
                      title="내 지원 여정"
                      action={
                        <span className="label-pill">
                          {s.jobs.length}개의 기회
                        </span>
                      }
                    />
                    <div className="pipeline">
                      {stages.slice(0, 4).map((stage, i) => (
                        <button key={stage} onClick={() => go("companies")}>
                          <span className={`pipeline-icon pipe-${i}`}>
                            {i === 0 ? (
                              <Target size={16} />
                            ) : i === 1 ? (
                              <NotebookPen size={16} />
                            ) : i === 2 ? (
                              <Send size={15} />
                            ) : (
                              <MessageSquare size={16} />
                            )}
                          </span>
                          <div>
                            <strong>{stage}</strong>
                            <small>
                              {
                                [
                                  "마음에 담아 둔 기업",
                                  "나의 이야기를 다듬는 중",
                                  "지원 완료, 다음 단계를 기다려요",
                                  "자신 있게 나를 소개해요",
                                ][i]
                              }
                            </small>
                          </div>
                          <span className="pipeline-count">
                            {s.jobs.filter((j) => j.status === stage).length}
                          </span>
                        </button>
                      ))}
                    </div>
                    <div className="journey-note">
                      <span className="live-dot" />
                      각자의 속도로, 꾸준히 나아가요.
                    </div>
                  </section>
                  <section className="insight-card">
                    <span className="insight-label">
                      <Sparkles size={16} />
                      CAREER NOTE
                    </span>
                    <h3>
                      경험의 크기보다,
                      <br />
                      나만의 역할이 중요해요.
                    </h3>
                    <p>
                      프로젝트에서 어떤 문제를 발견했고
                      <br />
                      어떻게 해결했는지 기록해 보세요.
                      <br />그 과정이 가장 좋은 면접 소재예요.
                    </p>
                    <button onClick={() => openProject()}>
                      내 경험 정리하기 <ArrowRight size={16} />
                    </button>
                    <Compass
                      size={104}
                      strokeWidth={0.7}
                      className="insight-watermark"
                    />
                  </section>
                  <div className="portfolio-mini">
                    <span className="mini-site">
                      <Globe size={21} />
                    </span>
                    <div>
                      <strong>나의 포트폴리오 사이트</strong>
                      <p>경험을 세상에 보여 주세요.</p>
                    </div>
                    <button
                      className="icon-btn"
                      aria-label="포트폴리오 만들기"
                      onClick={() => go("portfolio")}
                    >
                      <ArrowUpRight size={20} />
                    </button>
                  </div>
                </div>
              </div>
              <section className="recent-section">
                <SectionTitle
                  title="나의 경험, 차곡차곡"
                  action={
                    <TextLink onClick={() => go("projects")}>
                      프로젝트 전체 보기
                    </TextLink>
                  }
                />
                <div className="recent-projects">
                  {recentProjects.map((p, i) => (
                    <button
                      className="recent-project"
                      key={p.id}
                      onClick={() => openProject(p)}
                    >
                      <div className={`mini-project-art art-${i}`}>
                        <Layers size={27} strokeWidth={1} />
                      </div>
                      <div>
                        <span className="eyebrow">{p.category}</span>
                        <h3>{p.title}</h3>
                        <p>{p.tags.join(" · ")}</p>
                      </div>
                      <ArrowUpRight size={19} />
                    </button>
                  ))}
                  <button
                    className="project-add-card"
                    onClick={() => openProject()}
                  >
                    <span>
                      <Plus size={21} />
                    </span>
                    <strong>새로운 경험 기록하기</strong>
                    <small>작은 경험도 좋은 시작이 됩니다.</small>
                  </button>
                </div>
              </section>
              <footer className="workspace-footer">
                <span>차곡차곡 쌓이는 나의 커리어.</span>
                <span>
                  Made for your next chapter{" "}
                  <span className="footer-dot">✦</span> careermap
                </span>
              </footer>
            </>
          )}
          {view === "projects" && (
            <>
              <PageHeading
                eyebrow="EXPERIENCE LIBRARY"
                title="나의 경험, 나만의 이야기"
                description="프로젝트와 활동을 정리하고, 서류와 면접에 연결해 보세요."
                action={
                  <Button onClick={() => openProject()}>
                    <Plus size={16} />
                    프로젝트 추가
                  </Button>
                }
              />
              <div className="section-meta">
                <span>
                  전체 경험 <strong>{s.projects.length}</strong>
                </span>
                <span>
                  <ShieldCheck size={14} />
                  비공개 기록 · 직접 선택한 내용만 공개됩니다
                </span>
              </div>
              <div className="project-grid">
                {s.projects.map((p, i) => (
                  <article className="project-card" key={p.id}>
                    <button
                      className={`project-art art-${i % 3}`}
                      onClick={() => openProject(p)}
                    >
                      <span className="art-index">0{i + 1} / EXPERIENCE</span>
                      <div className="art-shape" />
                      <span className="art-label">{p.category}</span>
                      <ArrowUpRight className="art-arrow" size={25} />
                    </button>
                    <div className="project-body">
                      <span className="eyebrow">
                        {p.period || "기간 미입력"}
                      </span>
                      <h3>{p.title}</h3>
                      <p>{p.role || "나의 역할을 기록해 보세요."}</p>
                      <div className="tags">
                        {p.tags.map((t) => (
                          <span key={t}>{t}</span>
                        ))}
                      </div>
                      <div className="project-bottom">
                        <span>
                          <LinkIcon size={13} />
                          {
                            s.jobs.filter((j) => j.projectIds.includes(p.id))
                              .length
                          }
                          개 공고에 연결됨
                        </span>
                        <Button variant="ghost" onClick={() => openProject(p)}>
                          편집
                          <ArrowUpRight size={14} />
                        </Button>
                      </div>
                    </div>
                  </article>
                ))}
                {!s.projects.length && (
                  <Empty
                    icon={<FolderKanban size={30} />}
                    title="첫 경험을 기록해 볼까요?"
                    description="프로젝트, 연구, 업무, 동아리 활동까지. 무엇이든 좋아요."
                    action={
                      <Button onClick={() => openProject()}>
                        경험 기록하기
                      </Button>
                    }
                  />
                )}
              </div>
            </>
          )}
          {view === "self" && (
            <>
              <PageHeading
                eyebrow="KNOW YOURSELF"
                title="나를 이해하는 첫걸음"
                description="경험에서 강점을 발견하고, 다음 목표를 구체적으로 만들어 보세요."
              />
              <SelfReflectionPanel
                value={s.reflection}
                role={s.profile.role}
                aiBusy={aiBusy}
                onChange={(fn) => {
                  mutate((w) => ({
                    ...w,
                    reflection: fn(w.reflection || emptyReflection()),
                  })).catch(() => {});
                }}
                onAI={() => {
                  const source = reflectionSignature(
                    current().reflection || emptyReflection(),
                  );
                  runAI(
                    "reflection",
                    undefined,
                    undefined,
                    undefined,
                    (text) => {
                      if (
                        source !==
                        reflectionSignature(
                          current().reflection || emptyReflection(),
                        )
                      ) {
                        notify(
                          "답변이 달라졌어요. 현재 답변으로 다시 정리해 주세요.",
                        );
                        return;
                      }
                      mutate((w) => ({
                        ...w,
                        reflection: {
                          ...(w.reflection || emptyReflection()),
                          analysis: {
                            text,
                            source,
                            date: new Date().toISOString(),
                          },
                        },
                      }))
                        .then(() => {
                          notify("AI 자기성찰을 저장했습니다.");
                          close();
                        })
                        .catch(() => {});
                    },
                  );
                }}
              />
              <div className="two-col">
                <section className="panel profile-panel">
                  <SectionTitle
                    title="나의 커리어 프로필"
                    action={
                      <Button
                        variant="ghost"
                        onClick={() => setModal("profile")}
                      >
                        수정
                        <ArrowUpRight size={14} />
                      </Button>
                    }
                  />
                  <div className="profile-identity">
                    <span className="large-avatar">
                      {s.profile.name.charAt(0)}
                    </span>
                    <h3>{s.profile.name}님</h3>
                    <p>{s.profile.role || "나에게 맞는 직무를 탐색 중"}</p>
                  </div>
                  <dl className="profile-details">
                    <div>
                      <dt>준비 유형</dt>
                      <dd>{s.profile.type}</dd>
                    </div>
                    <div>
                      <dt>전공 · 경험 배경</dt>
                      <dd>{s.profile.background}</dd>
                    </div>
                    <div>
                      <dt>목표 직무</dt>
                      <dd>{s.profile.role || "미정"}</dd>
                    </div>
                    <div>
                      <dt>기록한 경험</dt>
                      <dd>{s.projects.length}개</dd>
                    </div>
                  </dl>
                  <div className="note-box">
                    <Compass size={18} />
                    <p>
                      전공보다 목표 직무를 우선해 질문을 구성해요. 새로운 직무에
                      도전해도 괜찮아요.
                    </p>
                  </div>
                </section>
                <section className="panel">
                  <SectionTitle
                    title="경험에서 발견하는 SWOT"
                    description="기록한 경험을 근거로 강점과 보완할 점을 정리해요."
                    action={
                      <div className="button-row">
                        <Button
                          variant="secondary"
                          onClick={() => {
                            setSelfDraft(s.selfAnalysis);
                            setSelfEditing(true);
                          }}
                        >
                          직접 작성
                        </Button>
                        <Button
                          disabled={aiBusy || !s.projects.length}
                          onClick={() =>
                            runAI(
                              "self",
                              undefined,
                              undefined,
                              undefined,
                              (text) => {
                                mutate((w) => ({ ...w, selfAnalysis: text }));
                                close();
                              },
                            )
                          }
                        >
                          <Sparkles size={16} />
                          AI 자기분석
                        </Button>
                      </div>
                    }
                  />
                  {s.selfAnalysis || selfEditing ? (
                    <>
                      {selfEditing ? (
                        <>
                          <textarea
                            aria-label="나의 자기분석"
                            rows={18}
                            value={selfDraft}
                            onChange={(e) => setSelfDraft(e.target.value)}
                          />
                          <Button
                            variant="secondary"
                            onClick={() =>
                              mutate((w) => ({ ...w, selfAnalysis: selfDraft }))
                                .then(() => setSelfEditing(false))
                                .catch(() => {})
                            }
                          >
                            자기분석 저장
                          </Button>
                        </>
                      ) : (
                        <>
                          <Markdown text={s.selfAnalysis} />
                          <Button
                            variant="ghost"
                            onClick={() => {
                              setSelfDraft(s.selfAnalysis);
                              setSelfEditing(true);
                            }}
                          >
                            내 생각으로 다듬기
                            <NotebookPen size={14} />
                          </Button>
                        </>
                      )}
                      <Button
                        variant="secondary"
                        onClick={() => setModal("task")}
                      >
                        <Plus size={15} />
                        분석에서 할 일 추가
                      </Button>
                    </>
                  ) : (
                    <div className="swot-placeholder">
                      {[
                        {
                          letter: "S",
                          title: "Strengths",
                          desc: "내 경험에서 찾은 강점",
                          color: "green",
                        },
                        {
                          letter: "W",
                          title: "Weaknesses",
                          desc: "보완하고 싶은 역량",
                          color: "gold",
                        },
                        {
                          letter: "O",
                          title: "Opportunities",
                          desc: "목표 직무의 새로운 기회",
                          color: "blue",
                        },
                        {
                          letter: "T",
                          title: "Threats",
                          desc: "준비 과정에서 살펴볼 점",
                          color: "purple",
                        },
                      ].map((x) => (
                        <div key={x.letter} className={x.color}>
                          <strong>{x.letter}</strong>
                          <span>{x.title}</span>
                          <p>{x.desc}</p>
                        </div>
                      ))}
                      <p className="helper-text">
                        프로젝트를 기록한 후 분석을 시작해 보세요. 결과는 수정할
                        수 있는 AI 제안입니다.
                      </p>
                    </div>
                  )}
                </section>
              </div>
            </>
          )}
          {view === "companies" && (
            <>
              <PageHeading
                eyebrow="YOUR NEXT OPPORTUNITY"
                title="희망기업과 다음 기회"
                description="기업별로 모으고, 공고별로 준비하세요. 나의 경험과 연결됩니다."
                action={
                  <div className="button-row">
                    <Button variant="secondary" onClick={() => openCompany()}>
                      <Building2 size={16} />
                      기업 추가
                    </Button>
                    <Button
                      onClick={() => {
                        if (!s.companies.length) openCompany();
                        else {
                          setEditJob(null);
                          setModal("job");
                        }
                      }}
                    >
                      <Plus size={16} />
                      공고 추가
                    </Button>
                  </div>
                }
              />
              {selectedJob && selectedCompany ? (
                <>
                  <button
                    className="back-link"
                    onClick={() => setActiveJob("")}
                  >
                    ← 전체 희망기업
                  </button>
                  <section className="panel job-heading">
                    <CompanyLogo
                      name={selectedCompany.name}
                      color={selectedCompany.color}
                    />
                    <div>
                      <span className="eyebrow">
                        {selectedCompany.industry}
                      </span>
                      <h2>
                        {selectedCompany.name}{" "}
                        <span>/ {selectedJob.title}</span>
                      </h2>
                      <p>
                        <CalendarDays size={14} />
                        {dates(selectedJob.deadline)} 마감{" "}
                        <span className="deadline">
                          {dday(selectedJob.deadline)}
                        </span>
                      </p>
                    </div>
                    <select
                      aria-label="지원 상태"
                      value={selectedJob.status}
                      onChange={(e) =>
                        mutate((w) => ({
                          ...w,
                          jobs: w.jobs.map((j) =>
                            j.id === selectedJob.id
                              ? {
                                  ...j,
                                  status: e.target.value as Job["status"],
                                }
                              : j,
                          ),
                        }))
                      }
                    >
                      {stages.map((x) => (
                        <option key={x}>{x}</option>
                      ))}
                    </select>
                  </section>
                  <div className="tab-bar">
                    {[
                      { id: "overview", name: "지원 개요" },
                      { id: "analysis", name: "기업 · 맞춤 분석" },
                      { id: "documents", name: "지원 서류" },
                      { id: "interview", name: "면접 준비" },
                    ].map((t) => (
                      <button
                        key={t.id}
                        className={companyTab === t.id ? "active" : ""}
                        onClick={() => setCompanyTab(t.id as typeof companyTab)}
                      >
                        {t.name}
                      </button>
                    ))}
                  </div>
                  {companyTab === "overview" && (
                    <div className="two-col">
                      <section className="panel">
                        <SectionTitle
                          title="공고와 기업 자료"
                          action={
                            <Button
                              variant="ghost"
                              onClick={() => {
                                setEditJob(selectedJob);
                                setModal("job");
                              }}
                            >
                              수정
                              <ArrowUpRight size={14} />
                            </Button>
                          }
                        />
                        <span className="label-pill">사용자 등록 자료</span>
                        <p className="body-copy">{selectedCompany.overview}</p>
                        <h3 className="subheading">채용 공고</h3>
                        <p className="body-copy preserve">
                          {selectedJob.description ||
                            "공고 내용을 등록해 주세요."}
                        </p>
                        {safeUrl(selectedJob.source) && (
                          <a
                            className="text-link"
                            href={safeUrl(selectedJob.source)}
                            target="_blank"
                            rel="noreferrer"
                          >
                            등록한 공고 링크
                            <ExternalLink size={14} />
                          </a>
                        )}
                        <p className="helper-text">
                          링크만 등록하면 본문을 읽지 않습니다. 분석할 공고
                          내용과 확인한 기업 자료를 직접 입력해 주세요.
                        </p>
                      </section>
                      <section className="panel">
                        <SectionTitle
                          title="이 공고에 연결할 경험"
                          description="기업에 보여줄 나의 이야기를 선택해요."
                        />
                        <div className="select-projects">
                          {s.projects.map((p) => (
                            <label key={p.id}>
                              <input
                                type="checkbox"
                                checked={selectedJob.projectIds.includes(p.id)}
                                onChange={(e) =>
                                  mutate((w) => ({
                                    ...w,
                                    jobs: w.jobs.map((j) =>
                                      j.id === selectedJob.id
                                        ? {
                                            ...j,
                                            projectIds: e.target.checked
                                              ? [...j.projectIds, p.id]
                                              : j.projectIds.filter(
                                                  (id) => id !== p.id,
                                                ),
                                          }
                                        : j,
                                    ),
                                  }))
                                }
                              />
                              <span>
                                <strong>{p.title}</strong>
                                <small>{p.role}</small>
                              </span>
                            </label>
                          ))}
                        </div>
                        <div className="note-box">
                          <LinkIcon size={17} />
                          <p>
                            선택한 경험이 서류 초안과 맞춤 분석의 근거가 됩니다.
                          </p>
                        </div>
                        <Button
                          variant="secondary"
                          onClick={() => newDocument(selectedJob.id, "이력서")}
                        >
                          <FileText size={16} />이 경험으로 이력서 만들기
                        </Button>
                      </section>
                    </div>
                  )}
                  {companyTab === "analysis" && (
                    <section className="panel">
                      <SectionTitle
                        title="이 기업과 나의 연결점"
                        description="등록한 기업·공고와 선택한 경험을 바탕으로 분석해요."
                        action={
                          <div className="button-row">
                            <Button
                              variant="secondary"
                              disabled={aiBusy}
                              onClick={() =>
                                runAI(
                                  "company",
                                  selectedJob.id,
                                  undefined,
                                  undefined,
                                  (text) => {
                                    mutate((w) => ({
                                      ...w,
                                      jobs: w.jobs.map((j) =>
                                        j.id === selectedJob.id
                                          ? {
                                              ...j,
                                              analysis: text,
                                              analyzedAt:
                                                new Date().toISOString(),
                                            }
                                          : j,
                                      ),
                                    }));
                                    close();
                                  },
                                )
                              }
                            >
                              <Sparkles size={15} />
                              기업·공고 분석
                            </Button>
                            <Button
                              disabled={
                                aiBusy || !selectedJob.projectIds.length
                              }
                              onClick={() =>
                                runAI(
                                  "match",
                                  selectedJob.id,
                                  undefined,
                                  undefined,
                                  (text) => {
                                    mutate((w) => ({
                                      ...w,
                                      jobs: w.jobs.map((j) =>
                                        j.id === selectedJob.id
                                          ? {
                                              ...j,
                                              matchAnalysis: text,
                                              analyzedAt:
                                                new Date().toISOString(),
                                            }
                                          : j,
                                      ),
                                    }));
                                    close();
                                  },
                                )
                              }
                            >
                              <Target size={16} />내 경험 맞춤 분석
                            </Button>
                          </div>
                        }
                      />
                      {selectedJob.analysis ? (
                        <>
                          <div className="analysis-meta">
                            <span className="label-pill">
                              AI 제안 · 검토 필요
                            </span>
                            <span>
                              분석일{" "}
                              {new Date(
                                selectedJob.analyzedAt,
                              ).toLocaleDateString("ko-KR")}
                            </span>
                          </div>
                          <Markdown text={selectedJob.analysis} />
                          <Button
                            variant="secondary"
                            onClick={() => setModal("task")}
                          >
                            <Plus size={16} />
                            준비 과제 추가
                          </Button>
                        </>
                      ) : (
                        <Empty
                          icon={<Target size={30} />}
                          title="공고에서 나의 강점을 찾아보세요"
                          description="기업·공고 자료를 분석하거나, 내 경험과 요구 역량의 연결점을 살펴볼 수 있어요."
                        />
                      )}
                      {selectedJob.matchAnalysis && (
                        <div className="match-analysis">
                          <h3>내 경험과 직무의 연결점</h3>
                          <Markdown text={selectedJob.matchAnalysis} />
                        </div>
                      )}
                    </section>
                  )}
                  {companyTab === "documents" && (
                    <section className="panel">
                      <SectionTitle
                        title="이 공고의 지원 서류"
                        action={
                          <div className="button-row">
                            <Button
                              variant="secondary"
                              onClick={() =>
                                newDocument(selectedJob.id, "이력서")
                              }
                            >
                              이력서 추가
                            </Button>
                            <Button
                              onClick={() =>
                                newDocument(selectedJob.id, "자기소개서")
                              }
                            >
                              자소서 추가
                            </Button>
                          </div>
                        }
                      />
                      <DocumentList
                        docs={s.documents.filter(
                          (d) => d.jobId === selectedJob.id,
                        )}
                        onSelect={(d) => {
                          setActiveDoc(d.id);
                          go("documents");
                        }}
                      />
                    </section>
                  )}
                  {companyTab === "interview" && (
                    <section className="panel">
                      <SectionTitle
                        title="이 공고의 면접 준비"
                        description="확정한 제출본이 있다면 그 내용을 우선해 준비해요."
                        action={
                          <Button onClick={() => go("interview")}>
                            <MessageSquare size={15} />
                            답변 준비 · 연습
                          </Button>
                        }
                      />
                      <div className="note-box">
                        <ShieldCheck size={18} />
                        <p>
                          {s.documents.some(
                            (d) => d.jobId === selectedJob.id && d.submitted,
                          )
                            ? "확정한 제출본이 있습니다. 면접 질문은 제출본과 연결한 프로젝트를 바탕으로 만듭니다."
                            : "아직 제출본이 없습니다. 경험·공고 기반으로 준비하거나 먼저 서류를 확정해 주세요."}
                        </p>
                      </div>
                    </section>
                  )}
                </>
              ) : (
                <div className="company-list">
                  {s.companies.map((c) => (
                    <section className="panel company-group" key={c.id}>
                      <div className="company-group-header">
                        <CompanyLogo name={c.name} color={c.color} />
                        <div>
                          <h2>
                            {c.name}
                            <span className="label-pill">
                              {c.priority === "높음"
                                ? "우선 준비"
                                : "관심 기업"}
                            </span>
                          </h2>
                          <p>{c.industry}</p>
                        </div>
                        <Button variant="ghost" onClick={() => openCompany(c)}>
                          기업 정보 수정
                          <ArrowUpRight size={15} />
                        </Button>
                      </div>
                      {s.jobs
                        .filter((j) => j.companyId === c.id)
                        .map((j) => (
                          <button
                            className="job-list-row"
                            key={j.id}
                            onClick={() => openJob(j)}
                          >
                            <div>
                              <h3>{j.title}</h3>
                              <p>
                                {dates(j.deadline)} 마감 · 경험{" "}
                                {j.projectIds.length}개 연결
                              </p>
                            </div>
                            <span className="status-badge">{j.status}</span>
                            <div className="job-progress">
                              <span>{progress(s, j)}%</span>
                              <div className="progress-track">
                                <span style={{ width: `${progress(s, j)}%` }} />
                              </div>
                            </div>
                            <span className="deadline">{dday(j.deadline)}</span>
                            <ChevronRight size={18} />
                          </button>
                        ))}
                      {!s.jobs.some((j) => j.companyId === c.id) && (
                        <p className="helper-text">
                          등록된 공고가 없습니다. 공고를 추가해 기업별 준비를
                          시작하세요.
                        </p>
                      )}
                    </section>
                  ))}
                  {!s.companies.length && (
                    <Empty
                      icon={<Building2 size={32} />}
                      title="어떤 기업에서 일하고 싶나요?"
                      description="공고가 없어도 관심 기업을 먼저 저장할 수 있어요."
                      action={
                        <Button onClick={() => openCompany()}>
                          첫 기업 추가
                        </Button>
                      }
                    />
                  )}
                </div>
              )}
            </>
          )}
          {view === "documents" && (
            <>
              <PageHeading
                eyebrow="YOUR STORY, WELL TOLD"
                title="마스터부터 기업별 지원 서류까지"
                description="공고 없이 공통 원본을 만들고, 기업이 정해지면 복사해 다듬어요."
              />
              <DocumentWorkspace
                state={s}
                activeId={activeDoc}
                onSelect={setActiveDoc}
                onCreate={newDocument}
                mutate={mutate}
                notify={notify}
                runAI={runAI}
                close={close}
              />
            </>
          )}
          {view === "interview" && (
            <>
              <PageHeading
                eyebrow="SPEAK YOUR EXPERIENCE"
                title="나의 이야기를 자신 있게"
                description="예상 질문과 답변을 준비하고, 실제 경험을 근거로 연습해요."
              />
              <InterviewWorkspace
                onAddJob={() => go("companies")}
                state={s}
                initialJob={activeJob}
                mutate={mutate}
                runAI={runAI}
                notify={notify}
                close={close}
              />
            </>
          )}
          {view === "portfolio" && (
            <>
              <PageHeading
                eyebrow="MAKE YOUR WORK VISIBLE"
                title="나만의 포트폴리오 사이트"
                description="기록한 경험을 골라, 세상에 보여줄 나만의 공간을 만들어 보세요."
                action={
                  <Button
                    variant="secondary"
                    onClick={() => setModal("preview")}
                  >
                    <Eye size={16} />
                    미리보기
                  </Button>
                }
              />
              <PortfolioWorkspace
                state={s}
                publication={data.publication}
                mutate={mutate}
                onPublish={() => setModal("confirmPublish")}
                onUnpublish={async () => {
                  try {
                    await api("/api/portfolio", "DELETE");
                    const n = { ...ref.current!, publication: null };
                    ref.current = n;
                    setData(n);
                    notify("사이트 공개를 해제했습니다.");
                  } catch (e) {
                    notify((e as Error).message);
                  }
                }}
              />
            </>
          )}
        </main>
      </div>
      {toast && (
        <div className="toast" role="status">
          <AlertCircle size={17} />
          {toast}
          <button
            className="icon-btn"
            aria-label="알림 닫기"
            onClick={() => setToast("")}
          >
            <X size={15} />
          </button>
        </div>
      )}
      {modal === "project" && (
        <ProjectForm
          project={editProject}
          profile={s.profile}
          onClose={close}
          onSave={(p) => {
            mutate((w) => ({
              ...w,
              projects: w.projects.some((x) => x.id === p.id)
                ? w.projects.map((x) => (x.id === p.id ? p : x))
                : [...w.projects, p],
            }))
              .then(() =>
                notify(
                  "경험을 저장했습니다. 연결된 서류와 공개본은 유지됩니다.",
                ),
              )
              .catch(() => {});
            close();
          }}
        />
      )}
      {modal === "company" && (
        <CompanyForm
          company={editCompany}
          onClose={close}
          onSave={(c) => {
            mutate((w) => ({
              ...w,
              companies: w.companies.some((x) => x.id === c.id)
                ? w.companies.map((x) => (x.id === c.id ? c : x))
                : [...w.companies, c],
            }));
            close();
            go("companies");
          }}
        />
      )}
      {modal === "job" && (
        <JobForm
          companies={s.companies}
          job={editJob}
          onClose={close}
          onSave={(j) => {
            mutate((w) => ({
              ...w,
              jobs: w.jobs.some((x) => x.id === j.id)
                ? w.jobs.map((x) => (x.id === j.id ? j : x))
                : [...w.jobs, j],
            }));
            close();
            setActiveJob(j.id);
            go("companies");
          }}
        />
      )}
      {modal === "task" && (
        <Modal
          title="다음 준비, 하나씩"
          subtitle="지금 할 수 있는 작은 과제를 추가해 보세요."
          onClose={close}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              mutate((w) => ({
                ...w,
                tasks: [
                  ...w.tasks,
                  {
                    id: uid(),
                    text: String(f.get("text")),
                    done: false,
                    category: String(f.get("category")),
                    jobId: String(f.get("jobId")),
                    deadline: String(f.get("deadline")),
                  },
                ],
              }));
              close();
            }}
          >
            <Field label="할 일">
              <input
                name="text"
                required
                maxLength={200}
                placeholder="예: 지원동기에 활용할 경험 정리하기"
              />
            </Field>
            <div className="form-grid">
              <Field label="준비 영역">
                <select name="category">
                  {[
                    "프로젝트",
                    "기업분석",
                    "이력서",
                    "자기소개서",
                    "면접",
                    "포트폴리오",
                  ].map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </Field>
              <Field label="목표일">
                <input type="date" name="deadline" />
              </Field>
            </div>
            <Field label="연결할 공고">
              <select name="jobId" defaultValue={activeJob}>
                <option value="">나의 커리어 전체</option>
                {s.jobs.map((j) => (
                  <option value={j.id} key={j.id}>
                    {s.companies.find((c) => c.id === j.companyId)?.name} ·{" "}
                    {j.title}
                  </option>
                ))}
              </select>
            </Field>
            <div className="modal-actions">
              <Button variant="secondary" type="button" onClick={close}>
                취소
              </Button>
              <Button type="submit">
                <Plus size={16} />할 일 추가
              </Button>
            </div>
          </form>
        </Modal>
      )}
      {modal === "profile" && (
        <ProfileForm
          profile={s.profile}
          onClose={close}
          onSave={(p) => {
            mutate((w) => ({ ...w, profile: p }));
            close();
          }}
        />
      )}
      {modal === "onboard" && (
        <ProfileForm
          profile={emptyWorkspace("나").profile}
          onboarding
          onClose={close}
          onSave={(p) => {
            mutate(() => ({
              ...emptyWorkspace(p.name),
              profile: p,
              portfolio: {
                ...emptyWorkspace(p.name).portfolio,
                title: `${p.name}의 포트폴리오`,
              },
            }));
            setActiveJob("");
            setActiveDoc("");
            close();
            go("projects");
            notify("나만의 공간이 준비되었습니다. 첫 경험을 기록해 보세요.");
          }}
        />
      )}
      {modal === "auth" && (
        <AuthForm
          beforeAuth={async () => {
            await queue.current;
            if (saveErrorRef.current)
              throw new Error(
                "계정 연결 전에 기록을 저장해 주세요. " + saveErrorRef.current,
              );
          }}
          onClose={close}
          onSuccess={(d) => {
            aiConsent.current = false;
            pendingAi.current = null;
            ref.current = d;
            revision.current = d.revision;
            setData(d);
            setActiveJob("");
            setActiveDoc("");
            close();
            notify("개인 작업 공간에 연결되었습니다.");
          }}
        />
      )}
      {modal === "preview" && (
        <Modal
          title="공개 전 미리보기"
          subtitle="선택한 항목만 표시됩니다. 아직 공개하지 않은 초안이에요."
          wide
          onClose={close}
        >
          <PortfolioView data={portfolioSnapshot(s)} preview />
        </Modal>
      )}
      {modal === "confirmPublish" && (
        <Modal
          title="포트폴리오를 공개할까요?"
          subtitle="링크를 가진 누구나 이 내용을 볼 수 있습니다."
          onClose={close}
        >
          <div className="publish-summary">
            <ShieldCheck size={28} />
            <strong>{s.portfolio.title}</strong>
            <p>
              선택한 프로젝트 {s.portfolio.projectIds.length}개 ·{" "}
              {s.portfolio.showEmail
                ? "연락 이메일 공개"
                : "연락 이메일 비공개"}
            </p>
            <p>
              내부 메모, 기업별 서류와 면접 기록은 공개되지 않습니다. 이후
              수정한 초안은 다시 게시할 때 반영됩니다.
            </p>
          </div>
          <div className="modal-actions">
            <Button variant="secondary" onClick={close}>
              다시 확인하기
            </Button>
            <Button
              disabled={!s.portfolio.projectIds.length}
              onClick={async () => {
                try {
                  await queue.current;
                  if (saveErrorRef.current)
                    throw new Error(
                      "먼저 초안을 저장해 주세요. " + saveErrorRef.current,
                    );
                  const p = await api<{ slug: string; updatedAt: string }>(
                    "/api/portfolio",
                    "POST",
                    {},
                  );
                  const n = { ...ref.current!, publication: p };
                  ref.current = n;
                  setData(n);
                  close();
                  notify("포트폴리오를 게시했습니다.");
                } catch (e) {
                  notify((e as Error).message);
                  if (data.guest) setModal("auth");
                }
              }}
            >
              <Globe size={16} />
              선택한 내용 공개
            </Button>
          </div>
        </Modal>
      )}
      {modal === "search" && (
        <Modal title="내 작업 공간 검색" onClose={close}>
          <div className="search-field">
            <Search size={18} />
            <input
              aria-label="검색어"
              placeholder="프로젝트, 기업, 서류 제목 검색"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {search.trim() ? (
            <div className="search-results">
              {s.projects
                .filter((p) =>
                  `${p.title} ${p.tags.join(" ")}`.includes(search),
                )
                .map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      go("projects");
                      openProject(p);
                    }}
                  >
                    <FolderKanban size={18} />
                    <span>
                      {p.title}
                      <small>프로젝트</small>
                    </span>
                    <ArrowUpRight size={16} />
                  </button>
                ))}
              {s.companies
                .filter((c) => c.name.includes(search))
                .map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      go("companies");
                      setActiveJob("");
                      close();
                    }}
                  >
                    <Building2 size={18} />
                    <span>
                      {c.name}
                      <small>희망기업</small>
                    </span>
                    <ArrowUpRight size={16} />
                  </button>
                ))}
              {s.documents
                .filter((d) => d.title.includes(search))
                .map((d) => (
                  <button
                    key={d.id}
                    onClick={() => {
                      go("documents");
                      setActiveDoc(d.id);
                      close();
                    }}
                  >
                    <FileText size={18} />
                    <span>
                      {d.title}
                      <small>{d.kind}</small>
                    </span>
                    <ArrowUpRight size={16} />
                  </button>
                ))}
              {![
                ...s.projects.map((p) => p.title),
                ...s.companies.map((c) => c.name),
                ...s.documents.map((d) => d.title),
                ...s.projects.flatMap((p) => p.tags),
              ].some((v) => v.includes(search)) && (
                <p className="helper-text">검색 결과가 없습니다.</p>
              )}
            </div>
          ) : (
            <p className="helper-text">경험이나 기업 이름으로 검색해 보세요.</p>
          )}
        </Modal>
      )}
      {modal === "aiConsent" && (
        <Modal
          title="경험에 맞는 제안을 받기 전에"
          subtitle="AI 제안에는 외부 AI 서비스 Groq를 사용합니다."
          onClose={close}
        >
          <p className="body-copy">
            준비 유형과 목표 직무, 선택한 경험, 기업·공고 자료 및 해당 작업의
            서류·답변을 AI 서비스에 전달합니다. 자기점검 AI 정리에는 선택한 질문
            답변과 이유도 포함됩니다. 이름과 이메일, 비공개 메모는 기본 자료에서
            제외합니다.
          </p>
          <p className="helper-text">
            본문에 직접 적은 개인정보는 함께 전송될 수 있어요. 민감한 내용은
            지운 뒤 사용해 주세요. AI 제안은 직접 검토한 후 반영할 수 있습니다.
          </p>
          <div className="modal-actions">
            <Button variant="secondary" onClick={close}>
              직접 준비할게요
            </Button>
            <Button
              onClick={() => {
                aiConsent.current = true;
                const action = pendingAi.current;
                pendingAi.current = null;
                action?.();
              }}
            >
              <Sparkles size={15} />
              동의하고 제안 받기
            </Button>
          </div>
        </Modal>
      )}
      {modal === "ai" && (
        <Modal
          title="내 경험에 맞춘 AI 제안"
          subtitle="AI가 만든 초안입니다. 경험·수치·기간·기업 정보를 확인한 뒤 반영해 주세요."
          wide
          onClose={() => {
            if (!aiBusy) close();
          }}
        >
          {aiBusy ? (
            <div className="ai-loading">
              <span className="ai-loading-icon">
                <Sparkles size={30} />
              </span>
              <h3>나의 이야기를 연결하고 있어요</h3>
              <p>이번 작업에 필요한 경험이나 답변을 살펴보고 있습니다.</p>
              <Spinner />
            </div>
          ) : (
            <>
              <Markdown text={aiResult} />
              {aiLimit > 0 && (
                <div
                  className={`word-count ${aiResult.length > aiLimit ? "over-limit" : ""}`}
                >
                  <span>
                    공백 포함 {aiResult.length}자 / 제한 {aiLimit}자
                  </span>
                  {aiResult.length > aiLimit && (
                    <span>제한 초과 · 초안에 반영한 뒤 줄여 주세요</span>
                  )}
                </div>
              )}
              <div className="modal-actions">
                <Button
                  variant="secondary"
                  onClick={() =>
                    navigator.clipboard
                      .writeText(aiResult)
                      .then(() => notify("제안을 복사했습니다."))
                      .catch(() =>
                        notify("복사하지 못했습니다. 직접 선택해 주세요."),
                      )
                  }
                >
                  <Copy size={15} />
                  복사
                </Button>
                {aiAction && (
                  <Button onClick={aiAction}>
                    <Check size={16} />
                    검토한 제안 반영
                  </Button>
                )}
              </div>
            </>
          )}
        </Modal>
      )}
    </div>
  );
}
function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <span className="eyebrow">
          <span className="live-dot" />
          {eyebrow}
        </span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
function DocumentList({
  docs,
  onSelect,
}: {
  docs: Document[];
  onSelect: (d: Document) => void;
}) {
  return docs.length ? (
    <div className="document-list">
      {docs.map((d) => (
        <button key={d.id} onClick={() => onSelect(d)}>
          <span className="file-icon">
            <FileText size={22} />
          </span>
          <div>
            <h3>{d.title}</h3>
            <p>
              {d.kind} · {d.text.length}자 · {d.versions.length}개 저장 버전
            </p>
          </div>
          <span className={`status-badge ${d.submitted ? "blue" : ""}`}>
            {d.submitted ? "제출본 있음" : "작업 중"}
          </span>
          <ChevronRight size={17} />
        </button>
      ))}
    </div>
  ) : (
    <Empty
      icon={<FileText size={28} />}
      title="첫 지원 서류를 만들어 보세요"
      description="연결한 경험을 바탕으로 초안을 만들고 나의 말로 다듬을 수 있어요."
    />
  );
}
type Mutate = (fn: (s: Workspace) => Workspace) => Promise<void>;
type RunAI = (
  task: AiTask,
  targetId?: string,
  answer?: string,
  question?: string,
  onApply?: (text: string) => void,
) => Promise<void>;
function ProjectForm({
  project,
  profile,
  onSave,
  onClose,
}: {
  project: Project | null;
  profile: Workspace["profile"];
  onSave: (p: Project) => void;
  onClose: () => void;
}) {
  const role = profile.role;
  const technical = /개발|데이터|연구|엔지니어/.test(role);
  return (
    <Modal
      title={project ? "경험을 더 선명하게" : "새로운 경험 기록하기"}
      subtitle={`${profile.type} · ${role || "직무 탐색"}에 맞춰 나의 역할과 과정을 정리해요.`}
      wide
      onClose={onClose}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          const get = (k: string) => String(f.get(k) || "");
          onSave({
            id: project?.id || uid(),
            title: get("title"),
            category: get("category"),
            period: get("period"),
            role: get("role"),
            problem: get("problem"),
            action: get("action"),
            result: get("result"),
            learning: get("learning"),
            tags: get("tags")
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean),
            link: get("link"),
            privateNote: get("privateNote"),
          });
        }}
      >
        <Field label="프로젝트 · 경험 이름">
          <input
            name="title"
            required
            maxLength={200}
            defaultValue={project?.title}
            placeholder="나의 경험을 한 문장으로"
          />
        </Field>
        <div className="form-grid">
          <Field label="경험 유형">
            <select
              name="category"
              defaultValue={project?.category || "프로젝트"}
            >
              {[
                "프로젝트",
                "UX/UI 디자인",
                "서비스 기획",
                "사이드 프로젝트",
                "연구 · 실험",
                "업무 경험",
                "대외활동",
                "학업 · 동아리",
              ].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </Field>
          <Field label="기간">
            <input
              name="period"
              defaultValue={project?.period}
              placeholder="2026.03 — 2026.06"
            />
          </Field>
        </div>
        <Field label="내 역할 · 개인 기여">
          <input
            name="role"
            defaultValue={project?.role}
            placeholder={
              technical
                ? "예: API 설계와 성능 검증 담당"
                : "예: 사용자 조사와 핵심 화면 설계 담당"
            }
          />
        </Field>
        <Field label="어떤 문제를 해결했나요?">
          <textarea
            name="problem"
            defaultValue={project?.problem}
            rows={3}
            placeholder="프로젝트의 시작점과 목표를 기록해 주세요."
          />
        </Field>
        <Field
          label={
            technical
              ? "어떻게 설계하고 검증했나요?"
              : "어떤 판단을 하고 실행했나요?"
          }
        >
          <textarea
            name="action"
            defaultValue={project?.action}
            rows={4}
            placeholder={
              technical
                ? "기술 선택 이유, 실험 조건, 검증 방법 등"
                : "조사, 우선순위, 협업과 실행 과정 등"
            }
          />
        </Field>
        <Field
          label="결과 · 성과"
          hint="수치가 없어도 괜찮아요. 팀 전체 성과와 나의 기여를 구분해 주세요."
        >
          <textarea
            name="result"
            defaultValue={project?.result}
            rows={3}
            placeholder="실제로 확인한 변화와 결과를 기록해 주세요."
          />
        </Field>
        <Field label="배운 점">
          <textarea name="learning" defaultValue={project?.learning} rows={2} />
        </Field>
        <div className="form-grid">
          <Field label="역량 · 도구 태그">
            <input
              name="tags"
              defaultValue={project?.tags.join(", ")}
              placeholder="쉼표로 구분: Figma, 사용자 조사"
            />
          </Field>
          <Field label="결과물 링크">
            <input
              name="link"
              type="url"
              defaultValue={project?.link}
              placeholder="https://"
            />
          </Field>
        </div>
        <Field
          label="비공개 메모"
          hint="이 내용은 AI 요청이나 공개 포트폴리오에 포함되지 않습니다."
        >
          <textarea
            name="privateNote"
            defaultValue={project?.privateNote}
            rows={2}
          />
        </Field>
        <div className="modal-actions">
          <Button type="button" variant="secondary" onClick={onClose}>
            취소
          </Button>
          <Button type="submit">
            <Save size={16} />
            경험 저장
          </Button>
        </div>
      </form>
    </Modal>
  );
}
function CompanyForm({
  company,
  onSave,
  onClose,
}: {
  company: Company | null;
  onSave: (c: Company) => void;
  onClose: () => void;
}) {
  return (
    <Modal
      title={company ? "기업 자료 수정" : "희망기업 추가"}
      subtitle="공고가 없어도 관심 기업부터 모아둘 수 있어요."
      onClose={onClose}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          onSave({
            id: company?.id || uid(),
            name: String(f.get("name")),
            industry: String(f.get("industry")),
            overview: String(f.get("overview")),
            website: String(f.get("website")),
            priority: String(f.get("priority")),
            color: company?.color || "#37685f",
          });
        }}
      >
        <Field label="기업 이름">
          <input
            name="name"
            required
            defaultValue={company?.name}
            placeholder="어떤 기업에서 일하고 싶나요?"
          />
        </Field>
        <div className="form-grid">
          <Field label="산업 · 분야">
            <input
              name="industry"
              defaultValue={company?.industry}
              placeholder="예: IT · 플랫폼"
            />
          </Field>
          <Field label="준비 우선순위">
            <select name="priority" defaultValue={company?.priority || "보통"}>
              <option>높음</option>
              <option>보통</option>
              <option>낮음</option>
            </select>
          </Field>
        </div>
        <Field label="공식 사이트">
          <input
            name="website"
            type="url"
            defaultValue={company?.website}
            placeholder="https://"
          />
        </Field>
        <Field
          label="확인한 기업 자료 · 관심 이유"
          hint="AI는 여기에 등록한 내용과 공고를 근거로 분석합니다."
        >
          <textarea
            name="overview"
            rows={5}
            defaultValue={company?.overview}
            placeholder="사업, 제품, 관심 있는 점과 자료 확인 날짜 등을 정리해 주세요."
          />
        </Field>
        <div className="modal-actions">
          <Button variant="secondary" type="button" onClick={onClose}>
            취소
          </Button>
          <Button type="submit">
            <Check size={16} />
            저장
          </Button>
        </div>
      </form>
    </Modal>
  );
}
function JobForm({
  companies,
  job,
  onSave,
  onClose,
}: {
  companies: Company[];
  job: Job | null;
  onSave: (j: Job) => void;
  onClose: () => void;
}) {
  return (
    <Modal
      title={job ? "공고 자료 수정" : "새로운 지원 공간"}
      subtitle="같은 기업의 다른 공고는 별도로 관리됩니다."
      wide
      onClose={onClose}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          onSave({
            id: job?.id || uid(),
            companyId: String(f.get("companyId")),
            title: String(f.get("title")),
            deadline: String(f.get("deadline")),
            status: job?.status || "관심",
            description: String(f.get("description")),
            source: String(f.get("source")),
            projectIds: job?.projectIds || [],
            analysis: job?.analysis || "",
            analyzedAt: job?.analyzedAt || "",
          });
        }}
      >
        <div className="form-grid">
          <Field label="희망기업">
            <select name="companyId" defaultValue={job?.companyId}>
              {companies.map((c) => (
                <option value={c.id} key={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="공고명 · 지원 직무">
            <input
              name="title"
              required
              defaultValue={job?.title}
              placeholder="예: 프로덕트 디자이너"
            />
          </Field>
        </div>
        <div className="form-grid">
          <Field label="마감일">
            <input type="date" name="deadline" defaultValue={job?.deadline} />
          </Field>
          <Field label="공고 링크">
            <input
              type="url"
              name="source"
              defaultValue={job?.source}
              placeholder="https://"
            />
          </Field>
        </div>
        <Field
          label="공고 본문 · 요구 역량"
          hint="링크 본문을 자동 수집하지 않습니다. 분석에 사용할 내용을 직접 입력해 주세요."
        >
          <textarea
            name="description"
            defaultValue={job?.description}
            rows={9}
            placeholder="담당 업무, 필수·우대 조건, 제출 서류 등을 붙여 넣어 주세요."
          />
        </Field>
        <div className="modal-actions">
          <Button type="button" variant="secondary" onClick={onClose}>
            취소
          </Button>
          <Button type="submit">
            <Save size={16} />
            지원 공간 저장
          </Button>
        </div>
      </form>
    </Modal>
  );
}
function ProfileForm({
  profile,
  onboarding = false,
  onSave,
  onClose,
}: {
  profile: Workspace["profile"];
  onboarding?: boolean;
  onSave: (p: Workspace["profile"]) => void;
  onClose: () => void;
}) {
  return (
    <Modal
      title={onboarding ? "나의 다음 커리어는?" : "나의 커리어 프로필"}
      subtitle={
        onboarding
          ? "샘플 데이터를 지우고 나만의 공간을 시작합니다."
          : "나의 배경과 목표에 맞춰 준비 방향을 조정해요."
      }
      onClose={onClose}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          onSave({
            name: String(f.get("name")),
            type: String(f.get("type")),
            background: String(f.get("background")),
            role: String(f.get("role")),
            bio: String(f.get("bio")),
          });
        }}
      >
        <Field label="이름 · 닉네임">
          <input
            name="name"
            required
            defaultValue={profile.name}
            maxLength={50}
          />
        </Field>
        <div className="form-grid">
          <Field label="어떤 준비를 하고 있나요?">
            <select name="type" defaultValue={profile.type}>
              <option>신입 취업</option>
              <option>경력 이직</option>
              <option>아직 결정하지 못함</option>
            </select>
          </Field>
          <Field label="전공 · 경험 배경">
            <select name="background" defaultValue={profile.background}>
              <option>이공계</option>
              <option>인문·사회계</option>
              <option>예체능</option>
              <option>융합·기타</option>
              <option>미입력</option>
            </select>
          </Field>
        </div>
        <Field
          label="목표 직무"
          hint="전공과 달라도 괜찮아요. 직무가 미정이면 비워 두세요."
        >
          <input
            name="role"
            defaultValue={profile.role}
            placeholder="예: 프론트엔드 개발자, 마케터"
          />
        </Field>
        <Field label="나를 소개하는 한 문장">
          <textarea name="bio" rows={3} defaultValue={profile.bio} />
        </Field>
        <div className="modal-actions">
          <Button variant="secondary" type="button" onClick={onClose}>
            취소
          </Button>
          <Button type="submit">
            {onboarding ? "나만의 준비 시작" : "프로필 저장"}
            <ArrowRight size={16} />
          </Button>
        </div>
      </form>
    </Modal>
  );
}
function AuthForm({
  onClose,
  onSuccess,
  beforeAuth,
}: {
  onClose: () => void;
  onSuccess: (d: WorkspaceResponse) => void;
  beforeAuth: () => Promise<void>;
}) {
  const [mode, setMode] = useState<"register" | "login">("register");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <Modal
      title={
        mode === "register"
          ? "나의 커리어 공간, 오래 간직하기"
          : "다시 만나서 반가워요"
      }
      subtitle="이메일로 로그인하고 경험과 준비 기록을 이어가세요."
      onClose={onClose}
    >
      <div className="tab-bar">
        <button
          className={mode === "register" ? "active" : ""}
          onClick={() => setMode("register")}
        >
          계정 만들기
        </button>
        <button
          className={mode === "login" ? "active" : ""}
          onClick={() => setMode("login")}
        >
          로그인
        </button>
      </div>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          const f = new FormData(e.currentTarget);
          try {
            await beforeAuth();
            onSuccess(
              await api<WorkspaceResponse>("/api/auth", "POST", {
                action: mode,
                email: f.get("email"),
                password: f.get("password"),
              }),
            );
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <Field label="이메일">
          <input name="email" type="email" required autoComplete="email" />
        </Field>
        <Field label="비밀번호" hint="10자 이상 입력해 주세요.">
          <input
            name="password"
            type="password"
            required
            minLength={10}
            maxLength={128}
            autoComplete={
              mode === "register" ? "new-password" : "current-password"
            }
          />
        </Field>
        {error && <p className="form-error">{error}</p>}
        <p className="helper-text">
          계정을 만들면 현재 체험 공간의 기록도 함께 보관합니다. 이메일 인증과
          비밀번호 재설정은 초기 버전에서 제공하지 않습니다.
        </p>
        <div className="modal-actions">
          <Button type="submit" disabled={busy}>
            {busy ? <Spinner /> : <LockKeyhole size={16} />}{" "}
            {mode === "register" ? "계정 만들기" : "로그인"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
function CopyDestination({
  state: s,
  sourceJobId,
  onCopy,
}: {
  state: Workspace;
  sourceJobId: string;
  onCopy: (jobId: string) => void;
}) {
  const [target, setTarget] = useState("__select");
  const destinations = s.jobs.filter((j) => j.id !== sourceJobId);
  if (!sourceJobId && !destinations.length)
    return (
      <p className="master-hint">
        공고를 등록하면 원본을 유지한 채 기업별로 복사할 수 있어요.
      </p>
    );
  return (
    <div className="material-copy">
      <label>
        <span>복사할 보관함</span>
        <select
          aria-label="복사할 보관함"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
        >
          <option value="__select">복사할 곳 선택</option>
          {sourceJobId && <option value="">마스터 · 공통 보관함</option>}
          {destinations.map((j) => (
            <option key={j.id} value={j.id}>
              {s.companies.find((c) => c.id === j.companyId)?.name} · {j.title}
            </option>
          ))}
        </select>
      </label>
      <Button
        variant="secondary"
        disabled={target === "__select"}
        onClick={() => {
          onCopy(target);
          setTarget("__select");
        }}
      >
        <Copy size={14} />
        독립된 복사본 만들기
      </Button>
    </div>
  );
}
function DocumentWorkspace({
  state: s,
  activeId,
  onSelect,
  onCreate,
  mutate,
  notify,
  runAI,
  close,
}: {
  state: Workspace;
  activeId: string;
  onSelect: (id: string) => void;
  onCreate: (jobId: string, kind: Document["kind"]) => void;
  mutate: Mutate;
  notify: (s: string) => void;
  runAI: RunAI;
  close: () => void;
}) {
  const doc = s.documents.find((d) => d.id === activeId);
  const [jobId, setJobId] = useState(doc?.jobId ?? "");
  useEffect(() => {
    if (doc) setJobId(doc.jobId);
  }, [doc?.id, doc?.jobId]);
  const [history, setHistory] = useState(false);
  return (
    <div className="document-workspace">
      <aside className="panel document-sidebar">
        <Field label="지원 공간">
          <select
            value={jobId}
            onChange={(e) => {
              setJobId(e.target.value);
              onSelect("");
            }}
          >
            <option value="">마스터 보관함 · 공고 없이 준비</option>
            {s.jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {s.companies.find((c) => c.id === j.companyId)?.name} ·{" "}
                {j.title}
              </option>
            ))}
          </select>
        </Field>
        <div className="button-row">
          <Button variant="secondary" onClick={() => onCreate(jobId, "이력서")}>
            <Plus size={14} />
            이력서
          </Button>
          <Button
            variant="secondary"
            onClick={() => onCreate(jobId, "자기소개서")}
          >
            <Plus size={14} />
            자소서
          </Button>
        </div>
        {s.profile.type === "경력 이직" && (
          <Button variant="ghost" onClick={() => onCreate(jobId, "경력기술서")}>
            경력기술서 추가
            <Plus size={14} />
          </Button>
        )}
        <div className="doc-nav">
          {s.documents
            .filter((d) => d.jobId === jobId)
            .map((d) => (
              <button
                key={d.id}
                className={doc?.id === d.id ? "active" : ""}
                onClick={() => {
                  onSelect(d.id);
                  setHistory(false);
                }}
              >
                <FileText size={18} />
                <span>
                  {d.title}
                  <small>
                    {d.submitted ? "제출본 확정" : "작업 중"} · {d.text.length}
                    자
                  </small>
                </span>
                {d.submitted && <ShieldCheck size={14} />}
              </button>
            ))}
          {!s.documents.some((d) => d.jobId === jobId) && (
            <p className="helper-text">이 보관함의 첫 문서를 추가해 보세요.</p>
          )}
        </div>
        <div className="note-box">
          <History size={18} />
          <p>
            마스터와 기업별 복사본은 독립적으로 저장됩니다. 제출본은 이후
            수정으로 바뀌지 않아요.
          </p>
        </div>
      </aside>
      <section className="panel document-editor">
        {doc ? (
          <>
            <div className="editor-heading">
              <div>
                <span className="eyebrow">
                  {
                    s.companies.find(
                      (c) =>
                        c.id ===
                        s.jobs.find((j) => j.id === doc.jobId)?.companyId,
                    )?.name
                  }{" "}
                  {!doc.jobId && "마스터 보관함"} / {doc.kind}
                </span>
                <h2>{doc.title}</h2>
              </div>
              <Button variant="ghost" onClick={() => setHistory(!history)}>
                <History size={15} />
                수정 이력 {doc.versions.length}
              </Button>
            </div>
            {doc.submitted && (
              <CopyDestination
                key={"copy-" + doc.id}
                state={s}
                sourceJobId={doc.jobId}
                onCopy={(target) => {
                  const copy = copyDocumentToSpace(s, doc, target);
                  mutate((w) => ({ ...w, documents: [...w.documents, copy] }))
                    .then(() => {
                      onSelect(copy.id);
                      notify("원본을 유지하고 독립된 서류로 복사했습니다.");
                    })
                    .catch(() => {});
                }}
              />
            )}
            {!doc.jobId && (
              <p className="master-hint">
                공통 원본입니다. 기업이 정해지면 복사본을 다듬고 제출본을
                확정하세요.
              </p>
            )}
            {doc.submitted ? (
              <>
                <div className="submitted-note">
                  <ShieldCheck size={19} />
                  <div>
                    <strong>제출본이 확정되었습니다.</strong>
                    <p>
                      {new Date(doc.submitted.date).toLocaleString("ko-KR")} ·
                      수정이 필요하면 새 작업본을 만드세요.
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      const copy = {
                        ...structuredClone(doc),
                        id: uid(),
                        title: doc.title + " 수정본",
                        submitted: undefined,
                      };
                      mutate((w) => ({
                        ...w,
                        documents: [...w.documents, copy],
                      }));
                      onSelect(copy.id);
                    }}
                  >
                    수정본 만들기
                  </Button>
                </div>
                <Markdown text={doc.submitted.text} />
                <div className="button-row">
                  <Button
                    variant="secondary"
                    onClick={() =>
                      navigator.clipboard
                        .writeText(doc.submitted!.text)
                        .then(() => notify("제출본을 복사했습니다."))
                    }
                  >
                    <Copy size={15} />
                    복사
                  </Button>
                  <Button variant="secondary" onClick={() => window.print()}>
                    <FileText size={15} />
                    인쇄 / PDF 저장
                  </Button>
                </div>
                <article className="print-sheet">
                  <h1>{doc.title}</h1>
                  <pre>{doc.submitted.text}</pre>
                </article>
              </>
            ) : (
              <DocumentEditor
                key={doc.id}
                doc={doc}
                state={s}
                onCopySelect={onSelect}
                projects={s.projects}
                mutate={mutate}
                notify={notify}
                runAI={runAI}
                close={close}
              />
            )}
            {history && (
              <div className="version-list">
                <h3>저장한 작업 버전</h3>
                {doc.versions.length ? (
                  doc.versions
                    .slice()
                    .reverse()
                    .map((v) => (
                      <div key={v.id}>
                        <div>
                          <strong>
                            {new Date(v.date).toLocaleString("ko-KR")}
                          </strong>
                          <p>{v.text.slice(0, 75) || "빈 초안"}…</p>
                        </div>
                        {!doc.submitted && (
                          <Button
                            variant="secondary"
                            onClick={() =>
                              mutate((w) => ({
                                ...w,
                                documents: w.documents.map((d) =>
                                  d.id === doc.id
                                    ? {
                                        ...d,
                                        text: v.text,
                                        versions: [
                                          ...d.versions,
                                          {
                                            id: uid(),
                                            text: d.text,
                                            date: new Date().toISOString(),
                                          },
                                        ].slice(-30),
                                      }
                                    : d,
                                ),
                              }))
                            }
                          >
                            <RotateCcw size={13} />
                            복원
                          </Button>
                        )}
                      </div>
                    ))
                ) : (
                  <p className="helper-text">
                    내용을 수정하고 저장하면 이전 버전이 남습니다.
                  </p>
                )}
              </div>
            )}
          </>
        ) : (
          <Empty
            icon={<NotebookPen size={35} />}
            title="나의 이야기를 준비할 시간"
            description="마스터 보관함에서 공고 없이 이력서·자소서를 만들 수 있어요. 기업이 정해지면 복사해 다듬으세요."
          />
        )}
      </section>
    </div>
  );
}
function DocumentEditor({
  doc,
  state: s,
  onCopySelect,
  projects,
  mutate,
  notify,
  runAI,
  close,
}: {
  doc: Document;
  state: Workspace;
  onCopySelect: (id: string) => void;
  projects: Project[];
  mutate: Mutate;
  notify: (s: string) => void;
  runAI: RunAI;
  close: () => void;
}) {
  const [text, setText] = useState(doc.text),
    [question, setQuestion] = useState(doc.question),
    [limit, setLimit] = useState(doc.limit),
    [selected, setSelected] = useState(doc.projectIds),
    [confirm, setConfirm] = useState(false);
  useEffect(() => {
    setText(doc.text);
    setQuestion(doc.question);
    setLimit(doc.limit);
    setSelected(doc.projectIds);
  }, [doc.text, doc.question, doc.limit, doc.projectIds]);
  const changed =
    text !== doc.text ||
    question !== doc.question ||
    limit !== doc.limit ||
    selected.join() !== doc.projectIds.join();
  async function save(notice = true) {
    await mutate((w) => ({
      ...w,
      documents: w.documents.map((d) =>
        d.id === doc.id
          ? {
              ...d,
              text,
              question,
              limit,
              projectIds: selected,
              versions:
                text !== d.text
                  ? [
                      ...d.versions,
                      {
                        id: uid(),
                        text: d.text,
                        date: new Date().toISOString(),
                      },
                    ].slice(-30)
                  : d.versions,
            }
          : d,
      ),
    }));
    if (notice) notify("작업본을 저장했습니다.");
  }
  return (
    <>
      <CopyDestination
        state={s}
        sourceJobId={doc.jobId}
        onCopy={async (target) => {
          try {
            await save(false);
            let copyId = "";
            await mutate((w) => {
              const source = w.documents.find((d) => d.id === doc.id)!;
              const copy = copyDocumentToSpace(w, source, target);
              copyId = copy.id;
              return { ...w, documents: [...w.documents, copy] };
            });
            onCopySelect(copyId);
            notify("현재 원본을 저장하고 독립된 서류로 복사했습니다.");
          } catch {}
        }}
      />
      <div className="editor-fields">
        {doc.kind === "자기소개서" && (
          <>
            <Field label="실제 문항 또는 연습 문항">
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                rows={2}
              />
            </Field>
            <Field label="글자수 제한 (0 = 제한 없음)">
              <input
                type="number"
                min={0}
                max={10000}
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
              />
            </Field>
          </>
        )}
        <Field label="활용할 프로젝트 · 경험">
          <div className="experience-chips">
            {projects.map((p) => (
              <label
                className={selected.includes(p.id) ? "selected" : ""}
                key={p.id}
              >
                <input
                  type="checkbox"
                  checked={selected.includes(p.id)}
                  onChange={(e) =>
                    setSelected((ids) =>
                      e.target.checked
                        ? [...ids, p.id]
                        : ids.filter((x) => x !== p.id),
                    )
                  }
                />
                <span>
                  {selected.includes(p.id) && <Check size={12} />} {p.title}
                </span>
              </label>
            ))}
          </div>
        </Field>
        <div className="editor-toolbar">
          <span>{changed ? "저장하지 않은 변경 사항" : "저장된 작업본"}</span>
          <Button
            variant="secondary"
            onClick={async () => {
              try {
                await save(false);
                await runAI(
                  doc.kind === "자기소개서" ? "cover" : "resume",
                  doc.id,
                  undefined,
                  undefined,
                  (result) => {
                    mutate((w) => ({
                      ...w,
                      documents: w.documents.map((d) =>
                        d.id === doc.id
                          ? {
                              ...d,
                              text: result,
                              versions: [
                                ...d.versions,
                                {
                                  id: uid(),
                                  text: d.text,
                                  date: new Date().toISOString(),
                                },
                              ].slice(-30),
                            }
                          : d,
                      ),
                    }));
                    close();
                  },
                );
              } catch {}
            }}
          >
            <Sparkles size={15} />
            경험 기반 AI 초안
          </Button>
        </div>
        <textarea
          aria-label="서류 본문"
          className="writing-area"
          rows={16}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="내 경험을 나의 언어로 정리해 보세요. AI 초안은 검토 후 반영할 수 있습니다."
        />
        <div
          className={`word-count ${limit && text.length > limit ? "over-limit" : ""}`}
        >
          <span>
            공백 포함 {text.length}자 · 제외 {text.replace(/\s/g, "").length}자
          </span>
          {limit > 0 && (
            <span>
              제한 {limit}자 {text.length > limit ? "· 제한 초과" : ""}
            </span>
          )}
        </div>
      </div>
      <div className="editor-footer">
        <div className="button-row">
          <Button
            variant="secondary"
            onClick={() =>
              navigator.clipboard
                .writeText(text)
                .then(() => notify("본문을 복사했습니다."))
                .catch(() => notify("복사 권한을 확인해 주세요."))
            }
          >
            <Copy size={15} />
            복사
          </Button>
          <Button variant="secondary" onClick={() => window.print()}>
            <FileText size={15} />
            인쇄 / PDF
          </Button>
        </div>
        <div className="button-row">
          <Button variant="secondary" onClick={() => save().catch(() => {})}>
            <Save size={15} />
            작업본 저장
          </Button>
          <Button
            disabled={
              !doc.jobId ||
              !text.trim() ||
              Boolean(limit && text.length > limit)
            }
            onClick={() => setConfirm(true)}
          >
            <ShieldCheck size={16} />
            제출본 확정
          </Button>
        </div>
      </div>
      <article className="print-sheet">
        <h1>{doc.title}</h1>
        {question && <h2>{question}</h2>}
        <pre>{text}</pre>
      </article>
      {confirm && (
        <Modal
          title="이 버전을 제출본으로 확정할까요?"
          subtitle="직접 지원에 사용할 내용을 보관합니다. 기업에 자동 제출되지는 않습니다."
          onClose={() => setConfirm(false)}
        >
          <p className="body-copy">
            경험과 공고의 현재 내용도 함께 보관합니다. 이후 수정은 새 작업본에서
            진행할 수 있어요.
          </p>
          <div className="modal-actions">
            <Button variant="secondary" onClick={() => setConfirm(false)}>
              다시 검토
            </Button>
            <Button
              onClick={async () => {
                try {
                  await save(false);
                  await mutate((w) => ({
                    ...w,
                    documents: w.documents.map((d) =>
                      d.id === doc.id
                        ? {
                            ...d,
                            submitted: {
                              text: d.text,
                              date: new Date().toISOString(),
                              projectSnapshots: w.projects.filter((p) =>
                                d.projectIds.includes(p.id),
                              ),
                              jobSnapshot: structuredClone(
                                w.jobs.find((j) => j.id === d.jobId)!,
                              ),
                            },
                          }
                        : d,
                    ),
                  }));
                  setConfirm(false);
                  notify("제출본을 보관했습니다.");
                } catch {}
              }}
            >
              <Check size={15} />
              제출본 확정
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
function InterviewWorkspace({
  state: s,
  initialJob,
  mutate,
  runAI,
  notify,
  close,
  onAddJob,
}: {
  state: Workspace;
  initialJob: string;
  mutate: Mutate;
  runAI: RunAI;
  notify: (s: string) => void;
  close: () => void;
  onAddJob: () => void;
}) {
  const [jobId, setJobId] = useState(
    s.jobs.some((j) => j.id === initialJob) ? initialJob : "",
  );
  const [tab, setTab] = useState<"answers" | "practice" | "history">("answers");
  const [question, setQuestion] = useState(
    "프로젝트에서 가장 어려웠던 문제와 해결 과정을 소개해 주세요.",
  );
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const questions = s.questions.filter((q) => q.jobId === jobId);
  return (
    <>
      {!jobId && (
        <div className="master-intro">
          <Compass size={19} />
          <p>
            공고가 없어도 자기소개·강점·협업 경험 답변을 준비할 수 있어요.
            기업이 정해지면 원본을 남기고 해당 공간으로 복사하세요.
          </p>
        </div>
      )}
      <div className="interview-top panel">
        <Field label="준비할 지원 공간">
          <select
            value={jobId}
            onChange={(e) => {
              setJobId(e.target.value);
              setFeedback("");
            }}
          >
            <option value="">공통 답변 보관함 · 공고 없이 준비</option>
            {s.jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {s.companies.find((c) => c.id === j.companyId)?.name} ·{" "}
                {j.title}
              </option>
            ))}
          </select>
        </Field>
        <div className="button-row">
          <Button variant="secondary" onClick={() => setShowAdd(true)}>
            <Plus size={15} />
            질문 추가
          </Button>
          <Button
            onClick={() =>
              runAI("questions", jobId, undefined, undefined, (result) => {
                const source = s.documents.find(
                  (d) => d.jobId === jobId && d.submitted,
                );
                const parts = Array.from(
                  result.matchAll(
                    /^###\s+Q\d+[.．:]\s*(.+)\n([\s\S]*?)(?=^###\s+Q\d+|$(?![\s\S]))/gm,
                  ),
                );
                const items = parts.length
                  ? parts.map((m) => ({
                      id: uid(),
                      jobId,
                      question: m[1].trim(),
                      answer: m[2].trim(),
                      sourceDocumentId: source?.id || "",
                    }))
                  : [
                      {
                        id: uid(),
                        jobId,
                        question: "AI 예상 질문과 답변 구성",
                        answer: result,
                        sourceDocumentId: source?.id || "",
                      },
                    ];
                mutate((w) => ({
                  ...w,
                  questions: [...w.questions, ...items],
                }));
                close();
              })
            }
          >
            <Sparkles size={16} />
            예상 질문 제안
          </Button>
        </div>
      </div>
      <div className="tab-bar">
        <button
          className={tab === "answers" ? "active" : ""}
          onClick={() => setTab("answers")}
        >
          질문 · 답변 준비
        </button>
        <button
          className={tab === "practice" ? "active" : ""}
          onClick={() => setTab("practice")}
        >
          텍스트 면접 연습
        </button>
        <button
          className={tab === "history" ? "active" : ""}
          onClick={() => setTab("history")}
        >
          연습 기록 {s.practices.filter((p) => p.jobId === jobId).length}
        </button>
      </div>
      {tab === "answers" && (
        <div className="answer-list">
          {questions.map((q) => (
            <AnswerCard
              key={q.id}
              question={q}
              state={s}
              mutate={mutate}
              notify={notify}
              onPractice={() => {
                setQuestion(q.question);
                setAnswer("");
                setFeedback("");
                setTab("practice");
              }}
            />
          ))}
          {!questions.length && (
            <section className="panel">
              <Empty
                icon={<MessageSquare size={30} />}
                title="나의 경험에서 질문을 찾아보세요"
                description="예상 질문을 제안받거나 직접 질문을 추가해 답변을 준비할 수 있어요."
                action={
                  <Button variant="secondary" onClick={() => setShowAdd(true)}>
                    첫 질문 추가
                  </Button>
                }
              />
            </section>
          )}
        </div>
      )}
      {tab === "practice" && (
        <div className="two-col">
          <section className="panel practice-card">
            <span className="eyebrow">
              <span className="live-dot" />
              PRACTICE, AT YOUR PACE
            </span>
            <h2>한 질문씩, 나의 말로</h2>
            <p className="helper-text">
              텍스트 답변의 내용과 근거를 연습합니다. 목소리나 표정은 평가하지
              않아요.
            </p>
            <Field label="연습할 질문">
              <textarea
                rows={3}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
              />
            </Field>
            <Field label="나의 답변">
              <textarea
                rows={9}
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="상황, 내 행동, 결과를 떠올리며 답해 보세요."
              />
            </Field>
            <div className="button-row">
              <Button
                variant="secondary"
                onClick={() => {
                  if (!answer.trim()) return;
                  mutate((w) => ({
                    ...w,
                    questions: [
                      ...w.questions,
                      {
                        id: uid(),
                        jobId,
                        question,
                        answer,
                        sourceDocumentId: "",
                      },
                    ],
                  }));
                  notify("답변 라이브러리에 저장했습니다.");
                }}
              >
                답변 저장
              </Button>
              <Button
                disabled={!answer.trim() || !question.trim()}
                onClick={() =>
                  runAI("feedback", jobId, answer, question, (result) => {
                    setFeedback(result);
                    mutate((w) => ({
                      ...w,
                      practices: [
                        ...w.practices,
                        {
                          id: uid(),
                          jobId,
                          date: new Date().toISOString(),
                          question,
                          answer,
                          feedback: result,
                        },
                      ].slice(-100),
                    }));
                    close();
                  })
                }
              >
                <Sparkles size={15} />
                피드백 · 후속 질문
              </Button>
            </div>
          </section>
          <section className="panel">
            <SectionTitle
              title="답변을 더 선명하게"
              description="구체성, 논리, 직무 관련성과 경험 근거를 살펴봐요."
            />
            {feedback ? (
              <Markdown text={feedback} />
            ) : (
              <Empty
                icon={<Compass size={32} />}
                title="정답보다 나의 경험"
                description="없는 성과를 만들 필요는 없어요. 내가 했던 판단과 행동을 구체적으로 이야기해 주세요."
              />
            )}
          </section>
        </div>
      )}
      {tab === "history" && (
        <div className="practice-history">
          {s.practices
            .filter((p) => p.jobId === jobId)
            .slice()
            .reverse()
            .map((p) => (
              <section className="panel" key={p.id}>
                <span className="eyebrow">
                  {new Date(p.date).toLocaleString("ko-KR")}
                </span>
                <h3>{p.question}</h3>
                <details>
                  <summary>답변과 피드백 보기</summary>
                  <p className="body-copy preserve">{p.answer}</p>
                  <Markdown text={p.feedback} />
                </details>
              </section>
            ))}
          {!s.practices.some((p) => p.jobId === jobId) && (
            <Empty
              icon={<History size={29} />}
              title="첫 연습을 시작해요"
              description="답변을 연습하고 받은 피드백을 이곳에서 다시 볼 수 있어요."
            />
          )}
        </div>
      )}
      {showAdd && (
        <Modal title="준비할 면접 질문" onClose={() => setShowAdd(false)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              mutate((w) => ({
                ...w,
                questions: [
                  ...w.questions,
                  {
                    id: uid(),
                    jobId,
                    question: String(f.get("question")),
                    answer: String(f.get("answer")),
                    sourceDocumentId: "",
                  },
                ],
              }));
              setShowAdd(false);
            }}
          >
            <Field label="질문">
              <textarea
                name="question"
                required
                rows={3}
                placeholder="지원동기나 프로젝트 경험에 관한 질문"
              />
            </Field>
            <Field label="답변 · 핵심 키워드">
              <textarea name="answer" rows={6} />
            </Field>
            <div className="modal-actions">
              <Button type="submit">
                질문 저장
                <Check size={15} />
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
function AnswerCard({
  question: q,
  state: s,
  mutate,
  notify,
  onPractice,
}: {
  question: Question;
  state: Workspace;
  mutate: Mutate;
  notify: (s: string) => void;
  onPractice: () => void;
}) {
  const [answer, setAnswer] = useState(q.answer);
  useEffect(() => setAnswer(q.answer), [q.answer]);
  return (
    <section className="panel answer-card">
      <div className="answer-heading">
        <span className="question-icon">Q.</span>
        <h3>{q.question}</h3>
        {q.sourceDocumentId && <span className="label-pill">제출본 기반</span>}
      </div>
      <textarea
        aria-label={`${q.question} 답변`}
        value={answer}
        rows={answer.length > 500 ? 12 : 5}
        onChange={(e) => setAnswer(e.target.value)}
        placeholder="내 경험을 근거로 답변을 정리해 보세요."
      />
      <div className="button-row">
        <Button
          variant="secondary"
          onClick={() => {
            mutate((w) => ({
              ...w,
              questions: w.questions.map((x) =>
                x.id === q.id ? { ...x, answer } : x,
              ),
            }));
            notify("답변을 저장했습니다.");
          }}
        >
          <Save size={14} />
          답변 저장
        </Button>
        <Button variant="ghost" onClick={onPractice}>
          이 질문으로 연습
          <ArrowRight size={15} />
        </Button>
      </div>
      <CopyDestination
        state={s}
        sourceJobId={q.jobId}
        onCopy={(target) => {
          const copy = copyQuestionToSpace(s, { ...q, answer }, target);
          mutate((w) => ({
            ...w,
            questions: [
              ...w.questions.map((x) => (x.id === q.id ? { ...x, answer } : x)),
              copy,
            ],
          }))
            .then(() =>
              notify("현재 답변을 저장하고 독립된 답변으로 복사했습니다."),
            )
            .catch(() => {});
        }}
      />
    </section>
  );
}
function PortfolioWorkspace({
  state: s,
  publication,
  mutate,
  onPublish,
  onUnpublish,
}: {
  state: Workspace;
  publication: WorkspaceResponse["publication"];
  mutate: Mutate;
  onPublish: () => void;
  onUnpublish: () => void;
}) {
  const p = s.portfolio;
  const [title, setTitle] = useState(p.title),
    [subtitle, setSubtitle] = useState(p.subtitle),
    [about, setAbout] = useState(p.about),
    [email, setEmail] = useState(p.email),
    [showEmail, setShowEmail] = useState(p.showEmail);
  const [saved, setSaved] = useState(false);
  const dirty =
    title !== p.title ||
    subtitle !== p.subtitle ||
    about !== p.about ||
    email !== p.email ||
    showEmail !== p.showEmail;
  return (
    <div className="portfolio-layout">
      <div>
        <section className="panel">
          <SectionTitle
            title="내 사이트의 첫인상"
            description="기본 템플릿 · 차분한 여백과 명료한 프로젝트 소개"
          />
          <form
            onSubmit={(e) => {
              e.preventDefault();
              mutate((w) => ({
                ...w,
                portfolio: {
                  ...w.portfolio,
                  title,
                  subtitle,
                  about,
                  email,
                  showEmail,
                },
              }))
                .then(() => {
                  setSaved(true);
                  setTimeout(() => setSaved(false), 2500);
                })
                .catch(() => {});
            }}
          >
            <Field label="사이트 제목">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
              />
            </Field>
            <Field label="소개 문장">
              <input
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                maxLength={200}
              />
            </Field>
            <Field label="About me">
              <textarea
                rows={4}
                value={about}
                onChange={(e) => setAbout(e.target.value)}
              />
            </Field>
            <Field label="연락 이메일 (선택)">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <label className="check-label">
              <input
                type="checkbox"
                checked={showEmail}
                onChange={(e) => setShowEmail(e.target.checked)}
              />
              사이트에 연락 이메일 공개
            </label>
            <div className="modal-actions">
              <span className="helper-text">
                {dirty
                  ? "저장 후 미리보기와 게시에 반영됩니다."
                  : saved
                    ? "초안을 저장했습니다."
                    : "게시본은 다시 게시할 때 갱신됩니다."}
              </span>
              <Button type="submit" variant="secondary">
                <Save size={15} />
                사이트 초안 저장
              </Button>
            </div>
          </form>
        </section>
        <section className="panel portfolio-project-panel">
          <SectionTitle
            title="공개할 프로젝트"
            description="선택한 경험의 내용만 사이트에 표시됩니다."
          />
          <div className="select-projects">
            {s.projects.map((project) => (
              <label key={project.id}>
                <input
                  type="checkbox"
                  checked={p.projectIds.includes(project.id)}
                  onChange={(e) =>
                    mutate((w) => ({
                      ...w,
                      portfolio: {
                        ...w.portfolio,
                        projectIds: e.target.checked
                          ? [...w.portfolio.projectIds, project.id]
                          : w.portfolio.projectIds.filter(
                              (x) => x !== project.id,
                            ),
                      },
                    }))
                  }
                />
                <span>
                  <strong>{project.title}</strong>
                  <small>
                    {project.category} · {project.role}
                  </small>
                </span>
              </label>
            ))}
          </div>
          {p.projectIds.length > 0 && (
            <div className="project-order">
              <h3>표시 순서 · 공개용 문구</h3>
              {p.projectIds.map((id, i) => {
                const project = s.projects.find((p) => p.id === id)!;
                return (
                  <details key={id}>
                    <summary>
                      <span>
                        <span className="order-number">0{i + 1}</span>
                        {p.projectOverrides[id]?.title || project.title}
                      </span>
                      <button
                        type="button"
                        className="icon-btn"
                        aria-label={`${project.title} 위로 이동`}
                        disabled={i === 0}
                        onClick={(e) => {
                          e.preventDefault();
                          mutate((w) => {
                            const ids = [...w.portfolio.projectIds];
                            [ids[i - 1], ids[i]] = [ids[i], ids[i - 1]];
                            return {
                              ...w,
                              portfolio: { ...w.portfolio, projectIds: ids },
                            };
                          });
                        }}
                      >
                        ↑
                      </button>
                    </summary>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const f = new FormData(e.currentTarget);
                        mutate((w) => ({
                          ...w,
                          portfolio: {
                            ...w.portfolio,
                            projectOverrides: {
                              ...w.portfolio.projectOverrides,
                              [id]: {
                                title: String(f.get("title")),
                                result: String(f.get("result")),
                              },
                            },
                          },
                        }));
                      }}
                    >
                      <Field label="공개할 제목">
                        <input
                          name="title"
                          defaultValue={
                            p.projectOverrides[id]?.title || project.title
                          }
                        />
                      </Field>
                      <Field
                        label="공개할 성과"
                        hint="민감한 성과 수치는 공개용 문구로 바꿀 수 있습니다."
                      >
                        <textarea
                          name="result"
                          rows={3}
                          defaultValue={
                            p.projectOverrides[id]?.result ?? project.result
                          }
                        />
                      </Field>
                      <Button variant="secondary" type="submit">
                        공개용 문구 저장
                      </Button>
                    </form>
                  </details>
                );
              })}
            </div>
          )}
        </section>
      </div>
      <aside>
        <section className="panel publication-panel">
          <span className="publication-icon">
            <Globe size={27} />
          </span>
          <h2>나의 이야기를 세상에</h2>
          <p>
            직접 선택한 내용으로
            <br />
            나만의 사이트를 만들어 보세요.
          </p>
          <div className="site-thumbnail">
            <div className="browser-dots">
              <i />
              <i />
              <i />
            </div>
            <div className="thumbnail-content">
              <small>{s.profile.role}</small>
              <strong>{title}</strong>
              <span>{subtitle}</span>
              <div>
                <i />
                <i />
              </div>
            </div>
          </div>
          <div className="publication-info">
            <span>사이트 상태</span>
            <strong>{publication ? "공개 중" : "비공개 초안"}</strong>
          </div>
          <div className="publication-info">
            <span>선택한 프로젝트</span>
            <strong>{p.projectIds.length}개</strong>
          </div>
          <Button
            className="full-width"
            disabled={!p.projectIds.length || dirty}
            onClick={onPublish}
          >
            <Globe size={16} />
            {publication ? "변경 내용 다시 게시" : "사이트 공개하기"}
          </Button>
          {dirty && (
            <p className="helper-text">
              수정한 사이트 정보를 먼저 저장해 주세요.
            </p>
          )}
          {publication && (
            <>
              <a
                className="btn btn-secondary full-width"
                href={`/p/${publication.slug}`}
                target="_blank"
                rel="noreferrer"
              >
                공개 사이트 보기
                <ExternalLink size={15} />
              </a>
              <Button
                className="full-width"
                variant="ghost"
                onClick={onUnpublish}
              >
                공개 해제
              </Button>
            </>
          )}
          <div className="note-box">
            <LockKeyhole size={17} />
            <p>비공개 메모, 자기분석과 지원 서류는 공개되지 않습니다.</p>
          </div>
        </section>
      </aside>
    </div>
  );
}
