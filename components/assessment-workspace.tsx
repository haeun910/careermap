"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Link as LinkIcon,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import SelfReflectionPanel from "./self-reflection";
import { Button, Spinner } from "./ui";
import {
  allReflectionQuestions,
  answeredCount,
  emptyReflection,
  reflectionSignature,
} from "@/lib/reflection";
import { experienceSignature } from "@/lib/strategy";
import type { WorkspaceResponse, Workspace } from "@/lib/types";
export default function AssessmentWorkspace() {
  const router = useRouter();
  const [data, setData] = useState<WorkspaceResponse | null>(null),
    [error, setError] = useState(""),
    [pending, setPending] = useState(0),
    [started, setStarted] = useState(false),
    [finished, setFinished] = useState(false),
    [consent, setConsent] = useState(false),
    [selected, setSelected] = useState<string[]>([]),
    [aiBusy, setAiBusy] = useState(false),
    [aiError, setAiError] = useState("");
  const current = useRef<WorkspaceResponse | null>(null),
    queue = useRef(Promise.resolve()),
    revision = useRef(0),
    saveError = useRef(""),
    analysisLock = useRef(false),
    strategy = useRef<HTMLElement>(null);
  async function load() {
    try {
      const response = await fetch("/api/workspace", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setData(body);
      current.current = body;
      revision.current = body.revision;
      setSelected(
        body.state.reflection?.analysis?.projectIds?.filter((id: string) =>
          body.state.projects.some((p: { id: string }) => p.id === id),
        ) || body.state.projects.slice(0, 3).map((p: { id: string }) => p.id),
      );
      setStarted(
        answeredCount(body.state.reflection?.answers || {}) ===
          allReflectionQuestions.length,
      );
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  useEffect(() => {
    if (aiBusy)
      strategy.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [aiBusy, finished]);
  useEffect(() => {
    if (data?.state.reflection?.analysis?.text)
      document
        .querySelector(".reflection-ai")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [data?.state.reflection?.analysis?.text]);
  function mutate(fn: (s: Workspace) => Workspace) {
    const previous = current.current!;
    const state = fn(structuredClone(previous.state));
    const next = { ...previous, state };
    current.current = next;
    setData(next);
    setPending((n) => n + 1);
    const operation = queue.current.then(async () => {
      const response = await fetch("/api/workspace", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state, revision: revision.current }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      revision.current = body.revision;
      saveError.current = "";
      setError("");
      if (current.current)
        current.current = { ...current.current, revision: body.revision };
    });
    queue.current = operation
      .catch((e) => {
        saveError.current = e.message;
        setError(e.message);
      })
      .finally(() => setPending((n) => Math.max(0, n - 1)));
    return operation;
  }
  async function analyze() {
    strategy.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    if (!consent || analysisLock.current) return;
    analysisLock.current = true;
    setAiBusy(true);
    setAiError("");
    const source = reflectionSignature(
      current.current!.state.reflection || emptyReflection(),
    );
    const experienceSource = experienceSignature(
      current.current!.state.projects,
      selected,
    );
    try {
      await queue.current;
      if (saveError.current)
        throw new Error("답변 저장 오류를 먼저 해결해 주세요.");
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: "reflection", projectIds: selected }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      if (
        source !==
          reflectionSignature(
            current.current!.state.reflection || emptyReflection(),
          ) ||
        experienceSource !==
          experienceSignature(current.current!.state.projects, selected)
      )
        throw new Error(
          "답변이나 경험이 달라졌어요. 현재 내용으로 다시 분석해 주세요.",
        );
      await mutate((w) => ({
        ...w,
        reflection: {
          ...(w.reflection || emptyReflection()),
          analysis: {
            text: body.text,
            source,
            experienceSource,
            projectIds: [...selected],
            date: new Date().toISOString(),
          },
        },
      }));
    } catch (e) {
      setAiError(
        saveError.current
          ? "답변 저장 오류를 먼저 해결해 주세요. " + saveError.current
          : (e as Error).message,
      );
    } finally {
      analysisLock.current = false;
      setAiBusy(false);
    }
  }
  async function complete() {
    setFinished(true);
    const reflection = current.current!.state.reflection || emptyReflection();
    if (answeredCount(reflection.answers) !== allReflectionQuestions.length)
      return;
    if (
      !reflection.history.length ||
      reflectionSignature(reflection.history.at(-1)!) !==
        reflectionSignature(reflection)
    )
      void mutate((w) => {
        const r = w.reflection || emptyReflection();
        return {
          ...w,
          reflection: {
            ...r,
            history: [
              ...r.history,
              {
                id: crypto.randomUUID(),
                date: new Date().toISOString(),
                answers: structuredClone(r.answers),
                notes: structuredClone(r.notes),
              },
            ].slice(-10),
          },
        };
      }).catch(() => {});
    if (consent) await analyze();
    else
      strategy.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  async function leave() {
    await queue.current;
    if (saveError.current) {
      setError("저장 오류를 해결한 뒤 나가 주세요. " + saveError.current);
      return;
    }
    router.push("/");
  }
  if (!data)
    return (
      <main className="boot">
        {error ? (
          <>
            <p role="alert">{error}</p>
            <Button onClick={() => void load()}>다시 연결하기</Button>
          </>
        ) : (
          <>
            <Spinner />
            <p>나를 알아가는 질문을 준비하고 있어요.</p>
          </>
        )}
      </main>
    );
  const r = data.state.reflection || emptyReflection(),
    count = answeredCount(r.answers),
    done = count === allReflectionQuestions.length;
  const validAnalysis =
    r.analysis?.source === reflectionSignature(r) &&
    (!r.analysis.experienceSource ||
      r.analysis.experienceSource ===
        experienceSignature(data.state.projects, r.analysis.projectIds || []));
  const selection = (
    <div className="strategy-selection">
      <h3>
        함께 살펴볼 경험 <small>최대 3개</small>
      </h3>
      <p>
        성향은 선호를 보여 주고, 역량은 실제 경험으로 확인해요. 분석에 사용할
        경험을 골라 주세요.
      </p>
      <div className="experience-chips">
        {data.state.projects.map((p) => (
          <label
            className={selected.includes(p.id) ? "selected" : ""}
            key={p.id}
          >
            <input
              type="checkbox"
              checked={selected.includes(p.id)}
              disabled={
                aiBusy || (!selected.includes(p.id) && selected.length >= 3)
              }
              onChange={(e) =>
                setSelected((ids) =>
                  e.target.checked
                    ? [...ids, p.id]
                    : ids.filter((id) => id !== p.id),
                )
              }
            />
            <span>{p.title}</span>
          </label>
        ))}
      </div>
      {!data.state.projects.length && (
        <p className="helper-text">
          아직 정리한 경험이 없어요. 지금의 선호와 앞으로 준비할 경험을 중심으로
          전략을 만들 수 있어요.
        </p>
      )}
      <div className="strategy-consent">
        <ShieldCheck size={18} />
        <div>
          <p>
            AI 분석에는 검사 답변·선택한 경험의 요약·목표 직무를 Groq로
            전달합니다. 프로필 개인정보·비공개 메모·첨부 파일은 전송하지 않아요.
            경험이나 선택 이유에 직접 적은 개인정보는 먼저 지워 주세요.
          </p>
          <label>
            <input
              type="checkbox"
              checked={consent}
              disabled={aiBusy}
              onChange={(e) => setConsent(e.target.checked)}
            />
            <span>외부 AI 전송에 동의하고 완료 후 어필 전략을 받아볼게요.</span>
          </label>
        </div>
      </div>
    </div>
  );
  return (
    <div className="assessment-screen">
      <header className="assessment-topbar">
        <span className="assessment-brand">
          <LinkIcon size={21} />
          이음 <small>IEUM</small>
        </span>
        <span role="status">
          {pending ? "답변 저장 중…" : error ? "저장 확인 필요" : "답변 저장됨"}
        </span>
        <Button
          variant="ghost"
          disabled={aiBusy || pending > 0}
          onClick={() => void leave()}
        >
          <ArrowLeft size={15} />
          저장하고 나가기
        </Button>
      </header>
      <main className="assessment-content">
        {error && (
          <div className="form-error" role="alert">
            {error}
            <Button
              variant="secondary"
              onClick={() => void mutate((w) => w).catch(() => {})}
            >
              현재 답변 저장 재시도
            </Button>
          </div>
        )}
        {!started ? (
          <section className="assessment-welcome">
            <span className="eyebrow">처음 준비하는 나를 위한 자기점검</span>
            <h1>
              내가 편하게 일하는 방식과
              <br />
              어필할 경험을 찾아요.
            </h1>
            <p>
              업무 환경·업무 관심·회사 상황 22문항에 정답 없이 답해 주세요.
              검사는 별도 화면에서 진행되고, 답변은 자동 저장되어 언제든 이어갈
              수 있어요.
            </p>
            <div className="assessment-welcome-info">
              <span>약 8~12분</span>
              <span>{count} / 22문항 답변</span>
              <span>나만 보는 결과</span>
            </div>
            {selection}
            <Button onClick={() => setStarted(true)}>
              {count ? "이어서 점검하기" : "자기점검 시작"}
              <ArrowRight size={16} />
            </Button>
            <p className="helper-text">
              검증된 채용·심리검사나 능력 점수가 아닌 자기성찰 도구입니다.
              선호를 실제 역량으로 단정하지 않아요.
            </p>
          </section>
        ) : (
          <>
            <SelfReflectionPanel
              value={validAnalysis ? r : { ...r, analysis: undefined }}
              role={data.state.profile.role}
              aiBusy={aiBusy}
              focused
              onChange={(fn) => {
                void mutate((w) => ({
                  ...w,
                  reflection: fn(w.reflection || emptyReflection()),
                })).catch(() => {});
              }}
              onAI={() => void analyze()}
              onComplete={() => void complete()}
              onResultsChange={setFinished}
            />
            {done && finished && (
              <section className="strategy-panel" ref={strategy}>
                <span className="eyebrow">
                  다음 단계 · 내 강점을 표현하는 방법
                </span>
                <h2>성향과 경험을 함께 보면 어필 전략이 보여요</h2>
                {selection}
                <Button
                  disabled={aiBusy || !consent || pending > 0}
                  onClick={() => void analyze()}
                >
                  {aiBusy ? <Spinner /> : <Sparkles size={16} />}{" "}
                  {aiBusy
                    ? "성향과 경험을 종합 분석하고 있어요…"
                    : validAnalysis
                      ? "선택한 경험으로 전략 다시 만들기"
                      : "역량 어필 전략 만들기"}
                </Button>
                {aiError && (
                  <p className="form-error" role="alert">
                    {aiError}
                  </p>
                )}
                {validAnalysis && (
                  <p className="helper-text">
                    위 답변 요약에서 저장한 ‘나의 역량 어필 전략’을 확인하세요.
                    AI가 제안한 표현은 실제 경험과 대조해 수정해 주세요.
                  </p>
                )}
                <div className="assessment-next-actions">
                  <Button variant="secondary" onClick={() => void leave()}>
                    경험·지원 서류 준비로 돌아가기
                    <ArrowRight size={15} />
                  </Button>
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
