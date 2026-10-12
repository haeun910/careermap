"use client";
import { useState, useEffect, useRef } from "react";
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Compass,
  Sparkles,
  History,
  RotateCcw,
} from "lucide-react";
import Markdown from "./markdown";
import { Button, Modal } from "./ui";
import {
  emptyReflection,
  reflectionSections,
  scaleLabels,
  allReflectionQuestions,
  situationQuestions,
  answeredCount,
  reflectionResults,
  reflectionSignature,
} from "@/lib/reflection";
import type { ReflectionSection } from "@/lib/reflection";
import type { SelfReflection, ReflectionAnswers } from "@/lib/types";
function ReasonNote({
  value,
  label,
  onSave,
}: {
  value: string;
  label: string;
  onSave: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  return (
    <label className="reflection-note">
      <span>
        이 선택을 한 이유 <small>선택 · 600자 이내</small>
      </span>
      <textarea
        aria-label={label + " · 선택한 이유"}
        rows={3}
        maxLength={600}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          if (draft !== value) onSave(draft);
        }}
        placeholder="실제 경험이나 중요하게 생각한 조건을 떠올려 보세요."
      />
      <small>입력을 마치고 다른 곳을 누르면 저장됩니다.</small>
    </label>
  );
}
export default function SelfReflectionPanel({
  value,
  onChange,
  onAI,
  aiBusy,
  role,
  focused = false,
  onComplete,
  onResultsChange,
}: {
  value?: SelfReflection;
  onChange: (fn: (r: SelfReflection) => SelfReflection) => void;
  onAI: () => void;
  aiBusy: boolean;
  role: string;
  focused?: boolean;
  onComplete?: () => void;
  onResultsChange?: (show: boolean) => void;
}) {
  const r = value || emptyReflection();
  const [section, setSection] = useState<ReflectionSection>(() =>
    focused
      ? allReflectionQuestions.find((q) => r.answers[q.id] === undefined)
          ?.section || "culture"
      : "culture",
  );
  const firstUnanswered = (part: ReflectionSection) =>
    Math.max(
      0,
      allReflectionQuestions
        .filter((q) => q.section === part)
        .findIndex((q) => r.answers[q.id] === undefined),
    );
  const [index, setIndex] = useState(() => firstUnanswered(section));
  const [results, setResults] = useState(
    () => answeredCount(r.answers) === allReflectionQuestions.length,
  );
  useEffect(() => {
    onResultsChange?.(results);
  }, [results, onResultsChange]);
  const [historyId, setHistoryId] = useState("");
  const [reset, setReset] = useState(false);
  const total = allReflectionQuestions.length;
  const count = answeredCount(r.answers);
  const questions = allReflectionQuestions.filter((q) => q.section === section);
  const q = questions[Math.min(index, questions.length - 1)];
  const questionPanel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (focused && !results) {
      window.scrollTo({ top: 0 });
      questionPanel.current
        ?.querySelector<HTMLElement>("legend")
        ?.focus({ preventScroll: true });
    }
  }, [q.id, results, focused]);
  const stamp = () => new Date().toISOString();
  const updateAnswer = (value: string | number | undefined) =>
    onChange((prev) => {
      const answers = { ...prev.answers };
      if (value === undefined) delete answers[q.id];
      else answers[q.id] = value;
      return { ...prev, answers, updatedAt: stamp(), analysis: undefined };
    });
  const selectedHistory = r.history.find((h) => h.id === historyId);
  const data: ReflectionAnswers = selectedHistory || r;
  const summaries = reflectionResults(data);
  const currentSummaries = reflectionResults(r);
  const latest = r.history.at(-1);
  const canRecord =
    count === total &&
    (!latest || reflectionSignature(latest) !== reflectionSignature(r));
  const switchSection = (part: ReflectionSection) => {
    setSection(part);
    setIndex(firstUnanswered(part));
    setResults(false);
  };
  const next = () => {
    if (index < questions.length - 1) setIndex(index + 1);
    else if (section === "culture") switchSection("job");
    else if (section === "job") switchSection("situation");
    else {
      setHistoryId("");
      setResults(true);
      onComplete?.();
    }
  };
  return (
    <section
      className={`panel reflection-panel ${focused ? "reflection-focused" : ""}`}
    >
      {(!focused || results) && (
        <>
          <div className="reflection-header">
            <div>
              <span className="eyebrow">WORK, IN YOUR OWN WAY</span>
              <h2>내게 맞는 환경과 업무 찾기</h2>
              <p>컬처핏·잡핏과 회사 상황 질문으로, 지금의 생각을 돌아봐요.</p>
            </div>
            <span className="label-pill">약 8~12분</span>
          </div>
          <div className="reflection-purpose">
            <Compass size={18} />
            <p>
              정답 없이 선호를 살펴보는 자기점검입니다. 검증된 채용·심리검사나
              특정 기업의 적합도 판정은 아니에요.
            </p>
          </div>
        </>
      )}
      <div className="reflection-progress">
        <span>
          {count} / {total}문항 답변
        </span>
        <span>선택은 자동 저장돼요</span>
        <div
          role="progressbar"
          aria-label="자기점검 답변 진행"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={count}
        >
          <i style={{ width: (count / total) * 100 + "%" }} />
        </div>
      </div>
      {(!focused || results) && (
        <div className="reflection-tabs" aria-label="자기점검 영역">
          {reflectionSections.map((part) => (
            <button
              key={part.id}
              aria-pressed={!results && section === part.id}
              onClick={() => switchSection(part.id)}
            >
              <strong>{part.title}</strong>
              <span>
                {answeredCount(r.answers, part.id)} / {part.time}
              </span>
            </button>
          ))}
          <button
            aria-pressed={results}
            disabled={!count && !r.history.length}
            onClick={() => {
              setHistoryId(count ? "" : r.history.at(-1)?.id || "");
              setResults(true);
            }}
          >
            <strong>답변 요약</strong>
            <span>선호와 확인할 질문</span>
          </button>
        </div>
      )}
      {results ? (
        <div className="reflection-results">
          <div className="reflection-result-heading">
            <div>
              <h3>
                {selectedHistory ? "이전 점검 기록" : "현재 답변으로 살펴본 나"}
              </h3>
              <p>
                {role
                  ? role + "를 탐색하는 참고 자료로 활용해 보세요."
                  : "끌리는 업무를 작은 경험으로 확인해 보세요."}{" "}
                선호가 실제 역량을 뜻하지는 않아요.
              </p>
            </div>
            <label className="reflection-history-select">
              <span>점검 기록</span>
              <select
                value={historyId}
                onChange={(e) => setHistoryId(e.target.value)}
              >
                <option value="">현재 답변</option>
                {r.history
                  .slice()
                  .reverse()
                  .map((h) => (
                    <option key={h.id} value={h.id}>
                      {new Date(h.date).toLocaleString("ko-KR", {
                        timeZone: "Asia/Seoul",
                      })}
                    </option>
                  ))}
              </select>
            </label>
          </div>
          {answeredCount(data.answers) < total && (
            <p className="reflection-incomplete">
              아직 답하지 않은 질문이 있어요. 영역별 두 문항이 모두 모였을 때
              선호를 정리합니다. 미응답을 중간 답변으로 계산하지 않아요.
            </p>
          )}
          {(["culture", "job"] as const).map((part) => (
            <div key={part} className="reflection-result-section">
              <h3>
                {part === "culture"
                  ? "컬처핏 · 내가 선호하는 업무 환경"
                  : "잡핏 · 탐색해 볼 업무"}
              </h3>
              <div className="reflection-result-grid">
                {summaries
                  .filter((x) => x.section === part)
                  .map((summary) => (
                    <article
                      className={
                        "reflection-result-card " +
                        (summary.complete ? "ready" : "")
                      }
                      key={summary.id}
                    >
                      <span className="eyebrow">{summary.title}</span>
                      <h4>{summary.preference}</h4>
                      {summary.complete ? (
                        <>
                          {summary.tension && (
                            <p className="reflection-tension">
                              두 답변의 방향이 달라요. 선호가 달라지는 조건을
                              함께 확인해 보세요.
                            </p>
                          )}
                          <details>
                            <summary>답변 근거 보기</summary>
                            {summary.evidence.map((e) => (
                              <p key={e.id}>
                                <strong>{e.prompt}</strong>
                                <span>{e.answer}</span>
                              </p>
                            ))}
                          </details>
                          <p className="reflection-company-question">
                            <strong>회사에 확인할 질문</strong>
                            {summary.check}
                          </p>
                          {selectedHistory &&
                            currentSummaries.find((x) => x.id === summary.id)
                              ?.complete &&
                            currentSummaries.find((x) => x.id === summary.id)
                              ?.preference !== summary.preference && (
                              <p className="reflection-change">
                                현재 답변에서는:{" "}
                                {
                                  currentSummaries.find(
                                    (x) => x.id === summary.id,
                                  )?.preference
                                }
                              </p>
                            )}
                        </>
                      ) : (
                        <p>관련 질문 {summary.answered} / 2개 답변</p>
                      )}
                    </article>
                  ))}
              </div>
            </div>
          ))}
          <div className="reflection-result-section">
            <h3>조직 상황 · 선택의 이유를 더 깊게</h3>
            {situationQuestions
              .filter((s) => typeof data.answers[s.id] === "string")
              .map((s) => {
                const c = s.choices.find((c) => c.id === data.answers[s.id]);
                if (!c) return null;
                return (
                  <details className="reflection-situation-result" key={s.id}>
                    <summary>
                      {s.title}
                      <span>{c.approach}</span>
                    </summary>
                    <p>
                      <strong>나의 선택</strong>
                      {c.label}
                    </p>
                    {data.notes[s.id] && (
                      <p className="preserve">
                        <strong>선택한 이유</strong>
                        {data.notes[s.id]}
                      </p>
                    )}
                    <p>
                      <strong>이 선택에서 볼 수 있는 점</strong>
                      {c.strength}
                    </p>
                    <p>
                      <strong>함께 고려할 점</strong>
                      {c.tradeoff}
                    </p>
                    <p>
                      <strong>다시 생각할 질문</strong>
                      {c.followup}
                    </p>
                  </details>
                );
              })}
            {!answeredCount(data.answers, "situation") && (
              <p className="helper-text">
                회사 상황 질문에 답하면 선택의 장점과 함께 고려할 점을 볼 수
                있어요.
              </p>
            )}
          </div>
          <div className="reflection-actions">
            <Button
              disabled={!canRecord || !!historyId}
              onClick={() =>
                onChange((prev) => ({
                  ...prev,
                  history: [
                    ...prev.history,
                    {
                      id: crypto.randomUUID(),
                      date: stamp(),
                      answers: structuredClone(prev.answers),
                      notes: structuredClone(prev.notes),
                    },
                  ].slice(-10),
                }))
              }
            >
              <History size={15} />
              점검 기록 남기기
            </Button>
            <Button
              variant="secondary"
              disabled={aiBusy || count !== total || !!historyId}
              onClick={onAI}
            >
              <Sparkles size={15} />
              성향·경험으로 역량 어필 전략 만들기
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setResults(false);
                setHistoryId("");
              }}
            >
              <ArrowLeft size={15} />
              답변 돌아보기
            </Button>
          </div>
          <p className="helper-text">
            모두 답하면 최근 10회 점검 기록을 남기고 비교할 수 있어요. AI 정리는
            22문항을 모두 답한 뒤 선택한 경험과 함께 분석할 수 있어요.
          </p>
          {!historyId && r.analysis?.source === reflectionSignature(r) && (
            <section className="reflection-ai">
              <h3>나의 역량 어필 전략</h3>
              <Markdown text={r.analysis.text} />
            </section>
          )}
          <details className="reflection-method">
            <summary>결과는 어떻게 정리하나요?</summary>
            <p>
              1~5점 동의 응답을 사용합니다. 컬처핏은 서로 다른 방향의 두 질문을
              같은 방향으로 환산해 평균을 냅니다. 평균 3.5 이상은 오른쪽 선호,
              2.5 이하는 왼쪽 선호, 그 사이는 상황 의존으로 표시합니다. 두
              질문의 환산 응답이 3점 이상 다르면 함께 살펴볼 점을 표시합니다.
              잡핏은 네 업무 영역의 관심을 각각 살피며, 능력 점수나 직무 순위를
              매기지 않습니다. 회사 상황에는 정답 점수를 붙이지 않고 선택의
              장점·고려할 점·후속 질문을 제공합니다. 통계적·심리측정적 검증을
              거친 검사는 아닙니다.
            </p>
          </details>
        </div>
      ) : (
        <div className="reflection-question" ref={questionPanel}>
          <div className="reflection-question-meta">
            <span>
              {reflectionSections.find((p) => p.id === section)?.description}
            </span>
            <strong>
              {index + 1} / {questions.length}
            </strong>
          </div>
          <fieldset>
            <legend tabIndex={-1}>
              {q.section === "situation" && (
                <span className="reflection-situation-title">{q.title}</span>
              )}
              {q.prompt}
            </legend>
            {q.section === "situation" ? (
              <div className="reflection-situation-choices">
                {q.choices.map((c) => (
                  <label
                    className={r.answers[q.id] === c.id ? "selected" : ""}
                    key={c.id}
                  >
                    <input
                      type="radio"
                      name={q.id}
                      value={c.id}
                      checked={r.answers[q.id] === c.id}
                      onChange={() => updateAnswer(c.id)}
                    />
                    <span>{c.label}</span>
                  </label>
                ))}
              </div>
            ) : (
              <div className="reflection-scale">
                {scaleLabels.map((label, i) => (
                  <label
                    className={r.answers[q.id] === i + 1 ? "selected" : ""}
                    key={label}
                  >
                    <input
                      aria-label={label}
                      type="radio"
                      name={q.id}
                      value={i + 1}
                      checked={r.answers[q.id] === i + 1}
                      onChange={() => updateAnswer(i + 1)}
                    />
                    <strong>{i + 1}</strong>
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            )}
          </fieldset>
          {q.section === "situation" && (
            <ReasonNote
              key={q.id}
              label={q.title}
              value={r.notes[q.id] || ""}
              onSave={(note) =>
                onChange((prev) => ({
                  ...prev,
                  notes: { ...prev.notes, [q.id]: note },
                  analysis: undefined,
                  updatedAt: stamp(),
                }))
              }
            />
          )}
          <div className="reflection-question-footer">
            <Button
              variant="ghost"
              disabled={index === 0 && section === "culture"}
              onClick={() => {
                if (index > 0) setIndex(index - 1);
                else {
                  const prev = section === "situation" ? "job" : "culture";
                  setSection(prev);
                  setIndex(
                    allReflectionQuestions.filter((q) => q.section === prev)
                      .length - 1,
                  );
                }
              }}
            >
              <ArrowLeft size={15} />
              이전 질문
            </Button>
            <Button
              variant="ghost"
              disabled={r.answers[q.id] === undefined}
              onClick={() => updateAnswer(undefined)}
            >
              선택 지우기
            </Button>
            <Button onClick={next}>
              {r.answers[q.id] === undefined
                ? "건너뛰고 다음"
                : index === questions.length - 1 && section === "situation"
                  ? "답변 요약 보기"
                  : "다음 질문"}
              <ArrowRight size={15} />
            </Button>
          </div>
        </div>
      )}
      <div className="reflection-bottom">
        <span>
          <Check size={14} />
          다음에 이어서 답해도 괜찮아요. 응답은 공개 포트폴리오에 포함되지
          않습니다.
        </span>
        {focused && !results && r.history.length > 0 && (
          <button
            onClick={() => {
              setHistoryId(r.history.at(-1)!.id);
              setResults(true);
            }}
          >
            <History size={13} />
            이전 점검 기록 보기
          </button>
        )}
        <button onClick={() => setReset(true)}>
          <RotateCcw size={13} />
          현재 답변 초기화
        </button>
      </div>
      {reset && (
        <Modal
          title="현재 답변을 초기화할까요?"
          subtitle="저장해 둔 이전 점검 기록은 남습니다."
          onClose={() => setReset(false)}
        >
          <p className="body-copy">
            현재 선택과 이유, 반영한 AI 요약을 비웁니다. 남기고 싶은 답변은 점검
            기록으로 저장한 뒤 초기화하세요.
          </p>
          <div className="modal-actions">
            <Button variant="secondary" onClick={() => setReset(false)}>
              계속 작성
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                onChange((prev) => ({
                  ...emptyReflection(),
                  history: prev.history,
                  updatedAt: stamp(),
                }));
                setIndex(0);
                setSection("culture");
                setResults(false);
                setHistoryId("");
                setReset(false);
              }}
            >
              답변 초기화
            </Button>
          </div>
        </Modal>
      )}
    </section>
  );
}
