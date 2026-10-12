"use client";
import { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  Save,
  ArrowRight,
  ShieldCheck,
  Pencil,
  CheckCircle2,
} from "lucide-react";
import { Modal, Field, Button, Spinner } from "./ui";
import { uid, safeUrl } from "@/lib/types";
import type { Project, Workspace } from "@/lib/types";
import {
  experienceCategories,
  draftFields,
  draftLabels,
  sourceLabels,
  projectDraftSchema,
  applyProjectDraft,
} from "@/lib/project-draft";
import type {
  ProjectDraft,
  ProjectInput,
  DraftField,
} from "@/lib/project-draft";

export default function ProjectForm({
  project,
  profile,
  onSave,
  onClose,
  beforeGenerate,
  hasConsent,
  onConsent,
}: {
  project: Project | null;
  profile: Workspace["profile"];
  onSave: (project: Project) => Promise<void>;
  onClose: () => void;
  beforeGenerate: () => Promise<void>;
  hasConsent: () => boolean;
  onConsent: () => void;
}) {
  const [mode, setMode] = useState<"quick" | "edit">(
    project ? "edit" : "quick",
  );
  const [editor, setEditor] = useState<Project>(
    () =>
      project || {
        id: uid(),
        title: "",
        category: "프로젝트",
        period: "",
        role: "",
        problem: "",
        action: "",
        result: "",
        learning: "",
        tags: [],
        link: "",
        privateNote: "",
      },
  );
  const [tagsText, setTagsText] = useState(project?.tags.join(", ") || "");
  const [about, setAbout] = useState(
    [project?.title, project?.problem]
      .filter(Boolean)
      .join("\n")
      .slice(0, 2000),
  );
  const [contribution, setContribution] = useState(
    [project?.role, project?.action].filter(Boolean).join("\n").slice(0, 2000),
  );
  const [outcome, setOutcome] = useState(
    [project?.result, project?.learning]
      .filter(Boolean)
      .join("\n")
      .slice(0, 2000),
  );
  const [step, setStep] = useState(0);
  const [reviewing, setReviewing] = useState(false);
  const wizardPanel = useRef<HTMLDivElement>(null);
  const editorForm = useRef<HTMLFormElement>(null);
  const [proposal, setProposal] = useState<ProjectDraft | null>(null);
  const [selected, setSelected] = useState<DraftField[]>([]);
  const [includeTags, setIncludeTags] = useState(false);
  const [followUps, setFollowUps] = useState<string[]>([]);
  const [supplements, setSupplements] = useState("");
  const [generating, setGenerating] = useState(false),
    [saving, setSaving] = useState(false);
  const [consent, setConsent] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const controller = useRef<AbortController | null>(null);
  const review = useRef<HTMLElement>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const technical = /개발|데이터|연구|엔지니어/.test(profile.role);
  const busy = generating || saving;
  const answerSummary = [
    { label: "경험 유형", value: editor.category },
    { label: "경험 설명", value: about },
    { label: "내가 한 일", value: contribution },
    { label: "결과와 배운 점", value: outcome },
    { label: "경험 기간", value: editor.period },
    { label: "결과물 주소", value: editor.link },
  ];
  const currentStepValue = answerSummary[step]?.value || "";
  useEffect(() => {
    const panel = mode === "quick" ? wizardPanel.current : editorForm.current;
    if (!panel || generating) return;
    panel.closest(".modal")?.scrollTo({ top: 0 });
    const focus =
      panel.querySelector<HTMLElement>("input:checked") ||
      panel.querySelector<HTMLElement>("textarea,input") ||
      panel.querySelector<HTMLElement>("button");
    focus?.focus({ preventScroll: true });
  }, [step, mode, generating, reviewing, consent]);
  function nextStep() {
    setError("");
    if (step === 1 && !about.trim()) return;
    if (step === 5 && editor.link && !safeUrl(editor.link)) {
      setError("http 또는 https로 시작하는 결과물 주소를 입력해 주세요.");
      return;
    }
    setStep((value) => Math.min(6, value + 1));
  }
  function field(key: keyof Project, value: string) {
    setEditor((prev) => ({ ...prev, [key]: value }));
  }
  async function generate() {
    if (generating || !about.trim()) return;
    if (!hasConsent()) {
      setConsent(true);
      return;
    }
    setGenerating(true);
    setError("");
    setMessage("");
    controller.current = new AbortController();
    const signal = controller.current.signal;
    const input: ProjectInput = {
      category:
        experienceCategories.find((c) => c === editor.category) || "프로젝트",
      about,
      contribution,
      outcome,
      additional: [
        supplements,
        proposal?.questions
          .map((q, i) =>
            followUps[i]?.trim()
              ? draftLabels[q.field] + ": " + followUps[i].trim()
              : "",
          )
          .filter(Boolean)
          .join("\n") || "",
      ]
        .filter(Boolean)
        .join("\n"),
    };
    try {
      if (input.additional.length > 4000)
        throw new Error(
          "보완 답변이 길어요. 추가 내용을 간략히 정리한 뒤 다시 시도해 주세요.",
        );
      await beforeGenerate();
      if (signal.aborted) return;
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: "project", projectInput: input }),
        signal,
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(
          data.error || "초안을 만들지 못했습니다. 입력은 유지됩니다.",
        );
      const parsed = projectDraftSchema.safeParse({
        draft: data.draft,
        sources: data.sources,
        questions: data.questions,
      });
      if (!parsed.success)
        throw new Error(
          "AI 초안 형식을 확인하지 못했습니다. 입력은 유지됩니다.",
        );
      const result = parsed.data;
      setProposal(result);
      const emptyFields = draftFields.filter(
        (key) => !editor[key].trim() && !!result.draft[key].trim(),
      );
      setSelected(emptyFields);
      const addTags = !tagsText.trim() && result.draft.tags.length > 0;
      setIncludeTags(addTags);
      setEditor((prev) => applyProjectDraft(prev, result, emptyFields, false));
      if (addTags) setTagsText(result.draft.tags.join(", "));
      setSupplements(input.additional);
      setFollowUps([]);
      setMode("edit");
      setReviewing(false);
      setMessage(
        "답변을 바탕으로 프로젝트 초안을 완성했어요. 내용을 확인하고 수정한 뒤 저장해 주세요.",
      );
    } catch (e) {
      if (!signal.aborted) setError((e as Error).message);
    } finally {
      setGenerating(false);
    }
  }
  function apply() {
    if (!proposal) return;
    setEditor((prev) => applyProjectDraft(prev, proposal, selected, false));
    if (includeTags) setTagsText(proposal.draft.tags.join(", "));
    setMode("edit");
    setError("");
    setMessage(
      "AI 초안을 반영했습니다. 문장을 수정한 뒤 경험을 저장해 주세요.",
    );
  }
  function useAnswers() {
    setEditor((prev) => ({
      ...prev,
      title: prev.title || about.trim().split("\n")[0].slice(0, 200),
      problem: prev.problem || about.trim(),
      action: prev.action || contribution.trim(),
      result: prev.result || outcome.trim(),
    }));
    setMode("edit");
    setError("");
    setMessage(
      "짧은 답변을 빈 항목에 옮겼습니다. 필요한 부분만 다듬어 저장해 주세요.",
    );
  }
  function editProposal(key: DraftField, value: string) {
    setProposal(
      (prev) => prev && { ...prev, draft: { ...prev.draft, [key]: value } },
    );
  }
  return (
    <Modal
      title={project ? "경험을 더 선명하게" : "새로운 경험 기록하기"}
      subtitle="질문에 하나씩 답하면, 하나의 프로젝트 기록이 완성돼요."
      wide
      onClose={onClose}
    >
      <div className="tab-bar project-mode-tabs" aria-label="경험 작성 방식">
        <button
          type="button"
          disabled={busy}
          aria-pressed={mode === "quick"}
          className={mode === "quick" ? "active" : ""}
          onClick={() => {
            if (mode !== "quick") setStep(0);
            setReviewing(false);
            setConsent(false);
            setMode("quick");
            setError("");
          }}
        >
          {" "}
          <Sparkles size={14} /> 질문으로 시작
        </button>
        <button
          type="button"
          disabled={busy}
          aria-pressed={mode === "edit"}
          className={mode === "edit" ? "active" : ""}
          onClick={() => {
            setMode("edit");
            setError("");
          }}
        >
          직접 작성 · 수정
        </button>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="project-feedback" role="status">
          {message}
        </p>
      )}
      {mode === "quick" ? (
        generating ? (
          <section
            className="project-generation"
            role="status"
            aria-live="polite"
            aria-busy="true"
          >
            <div className="project-generation-icon">
              <Spinner />
            </div>
            <span className="eyebrow">CONNECTING YOUR EXPERIENCE</span>
            <h3>
              답변을 바탕으로
              <br />
              프로젝트를 정리하고 있어요
            </h3>
            <p>
              흩어진 경험을 연결하고, 내 역할과 과정을 읽기 좋은 문장으로
              다듬어요.
            </p>
            <div className="project-generation-summary">
              <span>{editor.category}</span>
              <strong>{about.trim().split("\n")[0]}</strong>
            </div>
          </section>
        ) : reviewing && proposal ? (
          <div className="project-quick">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setReviewing(false);
                setStep(6);
              }}
            >
              답변 확인으로 돌아가기
            </Button>
            {proposal && (
              <section
                className="project-draft-review"
                ref={review}
                aria-label="경험 초안 검토"
              >
                <span className="eyebrow">YOUR EXPERIENCE, IN YOUR WORDS</span>
                <h3>초안을 확인해 주세요</h3>
                <p className="helper-text">
                  반영할 항목을 고르고 문장을 수정하세요. 기존 내용이 있는
                  항목은 직접 선택해야 바뀝니다.
                </p>
                {draftFields.map((key) => (
                  <div className="project-draft-field" key={key}>
                    <label className="project-apply-choice">
                      <input
                        type="checkbox"
                        checked={selected.includes(key)}
                        disabled={generating}
                        onChange={(e) =>
                          setSelected((prev) =>
                            e.target.checked
                              ? [...prev, key]
                              : prev.filter((x) => x !== key),
                          )
                        }
                      />
                      {draftLabels[key]} 적용
                    </label>
                    <Field
                      label={draftLabels[key] + " 초안"}
                      hint={
                        proposal.draft[key]
                          ? "AI가 참고한 답변: " +
                            proposal.sources[key]
                              .map((id) => sourceLabels[id])
                              .join(" · ")
                          : "확인한 내용이 부족해 비워 두었어요. 직접 입력하거나 아래 질문에 답해 보세요."
                      }
                    >
                      <textarea
                        value={proposal.draft[key]}
                        onChange={(e) => editProposal(key, e.target.value)}
                        maxLength={
                          key === "title" || key === "role" ? 200 : 3000
                        }
                        rows={key === "title" || key === "role" ? 2 : 3}
                        disabled={generating}
                      />
                    </Field>
                  </div>
                ))}
                {proposal.draft.tags.length > 0 && (
                  <label className="project-apply-choice">
                    <input
                      type="checkbox"
                      checked={includeTags}
                      disabled={generating}
                      onChange={(e) => setIncludeTags(e.target.checked)}
                    />
                    태그 적용: {proposal.draft.tags.join(", ")}
                  </label>
                )}
                <Button
                  type="button"
                  disabled={generating || (!selected.length && !includeTags)}
                  onClick={apply}
                >
                  선택한 초안 반영 <ArrowRight size={15} />
                </Button>
                {proposal.questions.length > 0 && (
                  <div className="project-followups">
                    <h4>조금 더 기억해 볼까요?</h4>
                    <p className="helper-text">
                      답할 수 있는 질문만 골라 적은 뒤 ‘보완 답변으로 다시
                      만들기’를 누르세요.
                    </p>
                    {proposal.questions.map((q, i) => (
                      <Field
                        key={i}
                        label={"보완 답변 " + (i + 1)}
                        hint={q.question}
                      >
                        <textarea
                          rows={2}
                          maxLength={1000}
                          value={followUps[i] || ""}
                          disabled={generating}
                          onChange={(e) =>
                            setFollowUps((prev) => {
                              const next = [...prev];
                              next[i] = e.target.value;
                              return next;
                            })
                          }
                        />
                      </Field>
                    ))}
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={generate}
                      disabled={generating || !followUps.some((x) => x?.trim())}
                    >
                      {generating ? <Spinner /> : <Sparkles size={14} />}보완
                      답변으로 다시 만들기
                    </Button>
                  </div>
                )}
              </section>
            )}
          </div>
        ) : (
          <div className="project-wizard" ref={wizardPanel}>
            <div className="project-wizard-progress">
              <span>
                {step < 6 ? "질문 " + (step + 1) + " / 6" : "답변 확인"}
              </span>
              <small>
                {step < 6
                  ? "기억나는 만큼만 답해 주세요"
                  : "이 답변으로 프로젝트 하나를 완성할게요"}
              </small>
              <div
                role="progressbar"
                aria-label="경험 정리 진행"
                aria-valuemin={0}
                aria-valuemax={6}
                aria-valuenow={Math.min(step + 1, 6)}
              >
                <span
                  style={{ width: (Math.min(step + 1, 6) / 6) * 100 + "%" }}
                />
              </div>
            </div>
            {consent ? (
              <section
                className="project-ai-consent"
                aria-label="경험 초안 AI 이용 안내"
              >
                <ShieldCheck size={20} />
                <div>
                  <h3>AI에게 이 답변을 전달할까요?</h3>
                  <p>
                    외부 AI 서비스 Groq에 입력한 짧은 답변과 보완 답변을
                    전달합니다. 비공개 메모·이름·이메일·다른 프로젝트는 전달하지
                    않습니다. 답변에 직접 적은 개인정보는 전달될 수 있어요.
                    기간과 결과물 링크는 작성한 그대로 보관하며 AI에 전달하지
                    않습니다.
                  </p>
                  <div className="button-row">
                    <Button
                      type="button"
                      onClick={() => {
                        onConsent();
                        setConsent(false);
                        generate();
                      }}
                    >
                      동의하고 프로젝트 완성하기
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setConsent(false)}
                    >
                      답변 확인으로 돌아가기
                    </Button>
                  </div>
                </div>
              </section>
            ) : step < 6 ? (
              <form
                key={step}
                className="project-question"
                onSubmit={(e) => {
                  e.preventDefault();
                  nextStep();
                }}
              >
                {step === 0 && (
                  <>
                    <h3>어떤 종류의 경험인가요?</h3>
                    <p className="helper-text">
                      프로젝트, 업무, 연구, 작은 활동까지 모두 좋아요.
                    </p>
                    <div
                      className="wizard-category-grid"
                      role="radiogroup"
                      aria-label="경험 유형"
                    >
                      {(experienceCategories.some((c) => c === editor.category)
                        ? [...experienceCategories]
                        : [editor.category, ...experienceCategories]
                      ).map((category) => (
                        <label
                          key={category}
                          className={
                            editor.category === category ? "selected" : ""
                          }
                        >
                          <input
                            type="radio"
                            name="wizard-category"
                            value={category}
                            checked={editor.category === category}
                            onChange={() => field("category", category)}
                          />
                          {category}
                        </label>
                      ))}
                    </div>
                  </>
                )}
                {step === 1 && (
                  <>
                    <h3>어떤 경험이었나요?</h3>
                    <p className="helper-text">
                      활동의 배경이나 만들고 싶었던 것을 한두 문장으로
                      알려주세요.
                    </p>
                    <Field
                      label="경험 설명"
                      hint="멋진 문장으로 쓰지 않아도 괜찮아요."
                    >
                      <textarea
                        required
                        maxLength={2000}
                        rows={5}
                        value={about}
                        onChange={(e) => setAbout(e.target.value)}
                        placeholder={
                          technical
                            ? "예: 팀 프로젝트로 웹사이트를 만들었어요."
                            : "예: 동아리에서 신입 부원 모집 행사를 준비했어요."
                        }
                      />
                    </Field>
                  </>
                )}
                {step === 2 && (
                  <>
                    <h3>내가 직접 한 일은 무엇인가요?</h3>
                    <p className="helper-text">
                      맡은 역할이나 실제 행동을 알려주세요. 작은 기여도 좋아요.
                    </p>
                    <Field
                      label="내가 한 일"
                      hint="선택 사항 · 사용한 도구나 판단한 이유가 기억나면 함께 적어 주세요."
                    >
                      <textarea
                        maxLength={2000}
                        rows={5}
                        value={contribution}
                        onChange={(e) => setContribution(e.target.value)}
                        placeholder={
                          technical
                            ? "예: React로 로그인 화면을 만들고 오류를 수정했어요."
                            : "예: 홍보 글을 쓰고 신청 폼을 만들었어요."
                        }
                      />
                    </Field>
                  </>
                )}
                {step === 3 && (
                  <>
                    <h3>결과나 배운 점이 있나요?</h3>
                    <p className="helper-text">
                      실제로 달라진 점이나 알게 된 것을 적어 주세요. 숫자가
                      없어도 괜찮아요.
                    </p>
                    <Field
                      label="결과와 배운 점"
                      hint="선택 사항 · 아직 모르겠으면 건너뛰어도 돼요."
                    >
                      <textarea
                        maxLength={2000}
                        rows={5}
                        value={outcome}
                        onChange={(e) => setOutcome(e.target.value)}
                        placeholder="예: 동료들이 만든 화면을 사용해 봤고, 오류 원인을 찾는 방법을 배웠어요."
                      />
                    </Field>
                  </>
                )}
                {step === 4 && (
                  <>
                    <h3>언제 했던 경험인가요?</h3>
                    <p className="helper-text">
                      정확한 날짜가 기억나지 않으면 학기나 대략적인 기간도
                      좋아요.
                    </p>
                    <Field
                      label="경험 기간"
                      hint="선택 사항 · 나중에 수정할 수 있어요."
                    >
                      <input
                        maxLength={200}
                        value={editor.period}
                        onChange={(e) => field("period", e.target.value)}
                        placeholder="예: 2026년 봄 학기, 2026.03 — 2026.06"
                      />
                    </Field>
                  </>
                )}
                {step === 5 && (
                  <>
                    <h3>보여줄 수 있는 결과물이 있나요?</h3>
                    <p className="helper-text">
                      사이트, 발표 자료, 저장소 등의 링크가 있으면 남겨 주세요.
                    </p>
                    <Field
                      label="결과물 주소"
                      hint="선택 사항 · 링크가 없어도 프로젝트를 완성할 수 있어요."
                    >
                      <input
                        type="url"
                        maxLength={2000}
                        value={editor.link}
                        onChange={(e) => field("link", e.target.value)}
                        placeholder="https://"
                      />
                    </Field>
                  </>
                )}
                <div className="project-wizard-actions">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => (step > 0 ? setStep(step - 1) : onClose())}
                  >
                    {step === 0 ? "취소" : "이전 질문"}
                  </Button>
                  <div>
                    {step >= 2 && !currentStepValue.trim() && (
                      <Button type="button" variant="ghost" onClick={nextStep}>
                        건너뛰기
                      </Button>
                    )}
                    <Button
                      type="submit"
                      disabled={step === 1 && !about.trim()}
                    >
                      {step === 5 ? "답변 확인하기" : "다음 질문"}
                      <ArrowRight size={14} />
                    </Button>
                  </div>
                </div>
              </form>
            ) : (
              <section className="project-answer-review">
                <h3>이제 하나의 프로젝트로 정리할게요</h3>
                <p className="helper-text">
                  답변을 확인해 주세요. 수정하고 싶은 답변은 다시 열 수 있어요.
                </p>
                <dl>
                  {answerSummary.map((answer, index) => (
                    <div key={answer.label}>
                      <dt>{answer.label}</dt>
                      <dd>{answer.value || "나중에 입력할게요"}</dd>
                      <button
                        type="button"
                        aria-label={answer.label + " 수정"}
                        onClick={() => {
                          setStep(index);
                          setConsent(false);
                        }}
                      >
                        <Pencil size={13} />
                        <span>수정</span>
                      </button>
                    </div>
                  ))}
                </dl>
                {supplements && (
                  <Field
                    label="기억해 낸 추가 내용"
                    hint="이전에 보완한 답변도 함께 참고합니다."
                  >
                    <textarea
                      value={supplements}
                      maxLength={4000}
                      rows={3}
                      onChange={(e) => setSupplements(e.target.value)}
                    />
                  </Field>
                )}
                <div className="project-wizard-actions">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setStep(5)}
                  >
                    이전 질문
                  </Button>
                  <Button type="button" onClick={generate}>
                    <Sparkles size={15} />
                    프로젝트 완성하기
                  </Button>
                </div>
                <Button
                  className="wizard-manual-fallback"
                  type="button"
                  variant="ghost"
                  onClick={useAnswers}
                >
                  AI 없이 답변으로 완성하기
                </Button>
              </section>
            )}
          </div>
        )
      ) : (
        <form
          ref={editorForm}
          onSubmit={async (e) => {
            e.preventDefault();
            setSaving(true);
            setError("");
            try {
              await onSave({
                ...editor,
                tags: tagsText
                  .split(",")
                  .map((t) => t.trim())
                  .filter(Boolean),
              });
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setSaving(false);
            }
          }}
        >
          {proposal && (
            <section className="project-completed">
              <CheckCircle2 size={22} />
              <div>
                <h3>프로젝트 초안이 완성됐어요</h3>
                <p>
                  답변으로 정리한 내용을 확인해 주세요. 더 기억나는 내용은
                  아래에서 수정할 수 있어요.
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={saving}
                  onClick={() => {
                    setReviewing(true);
                    setMode("quick");
                  }}
                >
                  AI 초안 비교·보완
                </Button>
              </div>
            </section>
          )}
          <Field label="프로젝트 · 경험 이름">
            <input
              name="title"
              required
              maxLength={200}
              value={editor.title}
              onChange={(e) => field("title", e.target.value)}
              placeholder="나의 경험을 한 문장으로"
              disabled={saving}
            />
          </Field>
          <div className="form-grid">
            <Field label="경험 유형">
              <select
                name="category"
                value={editor.category}
                onChange={(e) => field("category", e.target.value)}
                disabled={saving}
              >
                {!experienceCategories.some((c) => c === editor.category) && (
                  <option>{editor.category}</option>
                )}
                {experienceCategories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field label="기간">
              <input
                name="period"
                maxLength={200}
                value={editor.period}
                onChange={(e) => field("period", e.target.value)}
                placeholder="2026.03 — 2026.06"
                disabled={saving}
              />
            </Field>
          </div>
          <Field label="내 역할 · 개인 기여">
            <input
              name="role"
              maxLength={200}
              value={editor.role}
              onChange={(e) => field("role", e.target.value)}
              placeholder={
                technical
                  ? "예: API 설계와 성능 검증 담당"
                  : "예: 사용자 조사와 핵심 화면 설계 담당"
              }
              disabled={saving}
            />
          </Field>
          <Field label="어떤 문제를 해결했나요?">
            <textarea
              name="problem"
              value={editor.problem}
              onChange={(e) => field("problem", e.target.value)}
              rows={3}
              maxLength={16000}
              disabled={saving}
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
              value={editor.action}
              onChange={(e) => field("action", e.target.value)}
              rows={4}
              maxLength={16000}
              disabled={saving}
              placeholder="내가 직접 한 일과 선택한 이유를 적어 주세요."
            />
          </Field>
          <Field
            label="결과 · 성과"
            hint="수치가 없어도 괜찮아요. 팀 전체 성과와 나의 기여를 구분해 주세요."
          >
            <textarea
              name="result"
              value={editor.result}
              onChange={(e) => field("result", e.target.value)}
              rows={3}
              maxLength={16000}
              disabled={saving}
              placeholder="실제로 확인한 변화와 결과를 기록해 주세요."
            />
          </Field>
          <Field label="배운 점">
            <textarea
              name="learning"
              value={editor.learning}
              onChange={(e) => field("learning", e.target.value)}
              rows={2}
              maxLength={16000}
              disabled={saving}
            />
          </Field>
          <div className="form-grid">
            <Field label="역량 · 도구 태그">
              <input
                name="tags"
                value={tagsText}
                onChange={(e) => setTagsText(e.target.value)}
                placeholder="쉼표로 구분: Figma, 사용자 조사"
                disabled={saving}
              />
            </Field>
            <Field label="결과물 링크">
              <input
                name="link"
                type="url"
                maxLength={2000}
                value={editor.link}
                onChange={(e) => field("link", e.target.value)}
                placeholder="https://"
                disabled={saving}
              />
            </Field>
          </div>
          <Field
            label="비공개 메모"
            hint="이 내용은 AI 요청이나 공개 포트폴리오에 포함되지 않습니다."
          >
            <textarea
              name="privateNote"
              value={editor.privateNote}
              onChange={(e) => field("privateNote", e.target.value)}
              rows={2}
              maxLength={16000}
              disabled={saving}
            />
          </Field>
          <div className="modal-actions">
            <Button
              type="button"
              variant="secondary"
              disabled={saving}
              onClick={onClose}
            >
              취소
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Spinner /> : <Save size={16} />}경험 저장
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
