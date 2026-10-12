"use client";
import { useState, useEffect } from "react";
import { Plus, ArrowLeft, ArrowRight, Sparkles, Trash2 } from "lucide-react";
import { Button, Field } from "./ui";
import { coverTemplates, type CoverPrompt } from "@/lib/document-builder";
import type { Project } from "@/lib/types";
export default function CoverBuilder({
  value,
  onChange,
  projects,
  onAI,
}: {
  value: CoverPrompt[];
  onChange: (p: CoverPrompt[]) => void;
  projects: Project[];
  onAI: (id: string) => void;
}) {
  const [active, setActive] = useState(value[0]?.id || "");
  const [step, setStep] = useState(0);
  const [confirm, setConfirm] = useState("");
  useEffect(() => {
    if (!value.some((p) => p.id === active)) setActive(value[0]?.id || "");
  }, [value, active]);
  const prompt = value.find((p) => p.id === active) || value[0];
  function add(question = "") {
    const p: CoverPrompt = {
      id: crypto.randomUUID(),
      question,
      limit: 700,
      notes: "",
      answer: "",
      projectIds: [],
    };
    onChange([...value, p]);
    setActive(p.id);
    setStep(0);
  }
  function patch(changes: Partial<CoverPrompt>) {
    if (prompt)
      onChange(
        value.map((p) => (p.id === prompt.id ? { ...p, ...changes } : p)),
      );
  }
  const steps = ["문항 확인", "경험·핵심 내용", "답변 작성"];
  return (
    <div className="document-builder">
      <div className="builder-intro">
        <h3>자기소개서는 문항부터 시작해요</h3>
        <p>
          기업의 실제 질문을 그대로 옮기고, 질문마다 활용할 경험과 답변을 따로
          준비하세요.
        </p>
      </div>
      <div className="cover-question-nav" aria-label="자기소개서 문항">
        {value.map((p, i) => (
          <button
            type="button"
            key={p.id}
            aria-pressed={prompt?.id === p.id}
            onClick={() => {
              setActive(p.id);
              setStep(p.question.trim() ? 2 : 0);
            }}
          >
            <span>문항 {i + 1}</span>
            <strong>{p.question || "질문을 입력해 주세요"}</strong>
            <small>
              {p.answer.length}
              {p.limit ? ` / ${p.limit}` : ""}자
            </small>
          </button>
        ))}
      </div>
      <div className="cover-add">
        <h4>
          {value.length ? "다른 문항도 추가할까요?" : "어떤 질문에 답할까요?"}
        </h4>
        <p>
          실제 문항이 없다면 아래 연습 문항으로 준비할 수 있어요. 기업이 공개한
          문항을 대신하는 목록은 아닙니다.
        </p>
        <div className="button-row">
          {coverTemplates.map((t) => (
            <Button
              type="button"
              variant="secondary"
              disabled={value.length >= 10}
              key={t.title}
              onClick={() => add(t.question)}
            >
              {t.title}
            </Button>
          ))}
          <Button
            type="button"
            variant="secondary"
            disabled={value.length >= 10}
            onClick={() => add()}
          >
            <Plus size={14} />
            직접 문항 추가
          </Button>
        </div>
      </div>
      {prompt && (
        <>
          <nav className="builder-steps" aria-label="자소서 작성 단계">
            {steps.map((title, i) => (
              <button
                type="button"
                key={title}
                aria-current={step === i ? "step" : undefined}
                disabled={i > 0 && !prompt.question.trim()}
                onClick={() => setStep(i)}
              >
                <span>{i + 1}</span>
                {title}
              </button>
            ))}
          </nav>
          {step === 0 && (
            <>
              <Field
                label="실제 문항 또는 연습 문항"
                hint="채용 공고의 질문을 그대로 붙여 넣어 주세요."
              >
                <textarea
                  value={prompt.question}
                  maxLength={2000}
                  rows={3}
                  onChange={(e) => patch({ question: e.target.value })}
                />
              </Field>
              <Field label="글자수 제한 (0 = 제한 없음)">
                <input
                  type="number"
                  min={0}
                  max={10000}
                  value={prompt.limit}
                  onChange={(e) =>
                    patch({
                      limit: Math.min(
                        10000,
                        Math.max(0, Math.floor(Number(e.target.value) || 0)),
                      ),
                    })
                  }
                />
              </Field>
            </>
          )}
          {step === 1 && (
            <>
              <h3>이 질문에 답할 실제 경험을 골라요</h3>
              <p className="helper-text">
                직접 맡은 일과 확인한 결과가 있는 경험을 선택해 주세요. 모든
                경험을 한 답변에 넣을 필요는 없어요.
              </p>
              <div className="experience-chips">
                {projects.map((p) => (
                  <label
                    className={
                      prompt.projectIds.includes(p.id) ? "selected" : ""
                    }
                    key={p.id}
                  >
                    <input
                      type="checkbox"
                      checked={prompt.projectIds.includes(p.id)}
                      onChange={(e) =>
                        patch({
                          projectIds: e.target.checked
                            ? [...prompt.projectIds, p.id]
                            : prompt.projectIds.filter((id) => id !== p.id),
                        })
                      }
                    />
                    <span>{p.title}</span>
                  </label>
                ))}
              </div>
              {projects
                .filter((p) => prompt.projectIds.includes(p.id))
                .map((p) => (
                  <details className="cover-experience-reference" key={p.id}>
                    <summary>{p.title} · 경험 내용 확인</summary>
                    <p>
                      <strong>내 역할</strong>
                      {p.role || "미입력"}
                    </p>
                    <p>
                      <strong>실행</strong>
                      {p.action || "미입력"}
                    </p>
                    <p>
                      <strong>결과</strong>
                      {p.result || "미입력"}
                    </p>
                  </details>
                ))}
              <Field
                label="이 문항에 넣을 핵심 내용"
                hint="선택한 경험에서 강조할 점, 직접 한 일, 실제 결과나 배운 점을 적어 주세요. 미리 정리한 경험이 없어도 실제 있었던 일을 메모할 수 있어요."
              >
                <textarea
                  value={prompt.notes}
                  maxLength={4000}
                  rows={5}
                  onChange={(e) => patch({ notes: e.target.value })}
                  placeholder="상황: 어떤 일이 있었나요?\n내 행동: 직접 무엇을 했나요?\n결과·배운 점: 무엇이 달라졌나요?"
                />
              </Field>
            </>
          )}
          {step === 2 && (
            <>
              <div className="cover-active-question">
                <span className="eyebrow">지금 답할 질문</span>
                <h3>{prompt.question}</h3>
                <small>
                  {prompt.limit
                    ? `공백 포함 ${prompt.limit}자 이내`
                    : "글자수 제한 없음"}
                </small>
              </div>
              <div className="cover-writing-guide">
                <strong>답변을 구성하는 순서</strong>
                <p>
                  질문에 대한 핵심 답변 → 실제 상황과 본인의 행동 → 확인한
                  결과·배운 점 → 지원 직무와의 연결
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setStep(1)}
                >
                  활용할 경험·메모 돌아보기
                </Button>
              </div>
              <Button
                type="button"
                variant="secondary"
                disabled={!prompt.projectIds.length && !prompt.notes.trim()}
                onClick={() => onAI(prompt.id)}
              >
                <Sparkles size={15} />이 문항의 AI 초안 만들기
              </Button>
              {!prompt.projectIds.length && !prompt.notes.trim() && (
                <p className="helper-text">
                  AI 초안을 쓰려면 이전 단계에서 경험을 고르거나 실제 있었던
                  일을 메모하세요.
                </p>
              )}
              <Field label="문항 답변">
                <textarea
                  rows={13}
                  value={prompt.answer}
                  maxLength={16000}
                  onChange={(e) => patch({ answer: e.target.value })}
                  placeholder="질문의 핵심에 먼저 답하고, 본인의 실제 행동을 구체적으로 적어 주세요."
                />
              </Field>
              <div
                className={`word-count ${prompt.limit && prompt.answer.length > prompt.limit ? "over-limit" : ""}`}
              >
                <span>
                  공백 포함 {prompt.answer.length}자 · 제외{" "}
                  {prompt.answer.replace(/\s/g, "").length}자
                </span>
                <span>
                  {prompt.limit
                    ? `제한 ${prompt.limit}자${prompt.answer.length > prompt.limit ? " · 제한 초과" : ""}`
                    : "제한 없음"}
                </span>
              </div>
            </>
          )}
          <div className="builder-navigation">
            <Button
              type="button"
              variant="ghost"
              disabled={step === 0}
              onClick={() => setStep(step - 1)}
            >
              <ArrowLeft size={15} />
              이전 단계
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={step === 2 || !prompt.question.trim()}
              onClick={() => setStep(step + 1)}
            >
              다음 단계
              <ArrowRight size={15} />
            </Button>
          </div>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setConfirm(prompt.id)}
          >
            <Trash2 size={14} />이 문항 삭제
          </Button>
          {confirm === prompt.id && (
            <div className="inline-confirm">
              <p>이 문항과 작성한 답변을 삭제할까요?</p>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setConfirm("")}
              >
                유지
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={() => {
                  onChange(value.filter((p) => p.id !== prompt.id));
                  setConfirm("");
                  setStep(0);
                }}
              >
                문항 삭제 확인
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
