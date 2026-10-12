"use client";
import { useState } from "react";
import {
  Plus,
  Trash2,
  ArrowRight,
  ArrowLeft,
  Download,
  Sparkles,
} from "lucide-react";
import ResumeSheet from "./resume-sheet";
import { Button, Field } from "./ui";
import type { ResumeData, ResumeEntry } from "@/lib/document-builder";
import { experienceEntry } from "@/lib/document-builder";
import type { Project } from "@/lib/types";
export default function ResumeBuilder({
  value: r,
  onChange,
  projects,
  onAI,
  careerDocument = false,
}: {
  value: ResumeData;
  onChange: (r: ResumeData) => void;
  projects: Project[];
  onAI: () => void;
  careerDocument?: boolean;
}) {
  const [step, setStep] = useState(0);
  const steps = ["기본 정보", "학력·경력", "역량·경험", "완성본 확인"];
  const set = (key: keyof ResumeData, value: string | ResumeEntry[]) =>
    onChange({ ...r, [key]: value });
  const group = (
    key: "education" | "career" | "experiences" | "credentials",
    title: string,
    titleLabel: string,
    detailLabel: string,
  ) => (
    <section className="resume-entry-group">
      <div className="builder-section-heading">
        <h3>{title}</h3>
        <Button
          type="button"
          variant="ghost"
          disabled={r[key].length >= (key === "education" ? 10 : 15)}
          onClick={() =>
            set(key, [
              ...r[key],
              {
                id: crypto.randomUUID(),
                title: "",
                detail: "",
                period: "",
                description: "",
              },
            ])
          }
        >
          <Plus size={15} />
          {title} 추가
        </Button>
      </div>
      <p className="helper-text">
        해당하는 내용만 입력하세요. 없는 항목은 비워 두어도 괜찮아요.
      </p>
      {r[key].map((entry, index) => (
        <div className="resume-entry" key={entry.id}>
          <div className="builder-entry-title">
            <strong>
              {title} {index + 1}
            </strong>
            <Button
              type="button"
              variant="ghost"
              aria-label={`${title} ${index + 1} 삭제`}
              onClick={() =>
                set(
                  key,
                  r[key].filter((x) => x.id !== entry.id),
                )
              }
            >
              <Trash2 size={14} />
            </Button>
          </div>
          <div className="form-row">
            {[
              ["title", titleLabel],
              ["detail", detailLabel],
              ["period", "기간 · 일자"],
            ].map(([field, label]) => (
              <Field label={label} key={field}>
                <input
                  maxLength={200}
                  value={entry[field as keyof ResumeEntry]}
                  onChange={(e) =>
                    set(
                      key,
                      r[key].map((x) =>
                        x.id === entry.id
                          ? { ...x, [field]: e.target.value }
                          : x,
                      ),
                    )
                  }
                />
              </Field>
            ))}
          </div>
          <Field label="주요 내용 · 본인의 기여">
            <textarea
              rows={3}
              maxLength={4000}
              value={entry.description}
              onChange={(e) =>
                set(
                  key,
                  r[key].map((x) =>
                    x.id === entry.id
                      ? { ...x, description: e.target.value }
                      : x,
                  ),
                )
              }
              placeholder={
                key === "education"
                  ? "관련 수업·연구·졸업 프로젝트가 있다면 적어 주세요."
                  : "실제로 한 일과 확인한 결과를 구체적으로 적어 주세요."
              }
            />
          </Field>
        </div>
      ))}
    </section>
  );
  return (
    <div className="document-builder">
      <div className="builder-intro">
        <h3>{careerDocument ? "경력기술서" : "이력서"}를 항목별로 완성해요</h3>
        <p>
          지원 직무와 관련된 사실을 간결하게 정리하세요. 단계별 입력이 한 장의
          문서로 모입니다.
        </p>
      </div>
      <nav className="builder-steps" aria-label="이력서 작성 단계">
        {steps.map((title, index) => (
          <button
            key={title}
            type="button"
            aria-current={index === step ? "step" : undefined}
            onClick={() => setStep(index)}
          >
            <span>{index + 1}</span>
            {title}
          </button>
        ))}
      </nav>
      {step === 0 && (
        <>
          <h3>먼저 나를 소개할 기본 정보부터</h3>
          <p className="helper-text">
            이름과 목표 직무부터 채우세요. 연락처는 직접 공유할 이력서에만
            들어갑니다.
          </p>
          <div className="form-row">
            <Field label="이력서 이름">
              <input
                value={r.name}
                maxLength={200}
                onChange={(e) => set("name", e.target.value)}
              />
            </Field>
            <Field label="지원 직무 · 한 줄 제목">
              <input
                value={r.headline}
                maxLength={200}
                onChange={(e) => set("headline", e.target.value)}
                placeholder="예: 사용자 문제를 풀어가는 서비스 기획자"
              />
            </Field>
          </div>
          <div className="form-row">
            <Field label="이력서 이메일">
              <input
                type="email"
                value={r.email}
                maxLength={320}
                onChange={(e) => set("email", e.target.value)}
              />
            </Field>
            <Field label="연락처">
              <input
                type="tel"
                value={r.phone}
                maxLength={200}
                onChange={(e) => set("phone", e.target.value)}
              />
            </Field>
          </div>
          <Field label="포트폴리오 주소">
            <input
              type="url"
              value={r.portfolio}
              maxLength={2000}
              onChange={(e) => set("portfolio", e.target.value)}
              placeholder="https://"
            />
          </Field>
          <Field
            label="짧은 소개"
            hint="어떤 일을 준비하고, 어떤 경험을 갖고 있는지 2~3문장으로 적어 보세요."
          >
            <textarea
              value={r.summary}
              maxLength={2000}
              rows={4}
              onChange={(e) => set("summary", e.target.value)}
            />
          </Field>
          <Button type="button" variant="secondary" onClick={onAI}>
            <Sparkles size={15} />
            경험으로 소개 문장 다듬기
          </Button>
        </>
      )}
      {step === 1 && (
        <>
          {group(
            "education",
            "학력",
            "학교 · 교육기관",
            "전공 · 과정 · 이수 상태",
          )}
          {group("career", "경력", "회사 · 조직", "직무 · 직책")}
        </>
      )}
      {step === 2 && (
        <>
          <Field
            label="보유 역량 · 도구"
            hint="실제로 사용할 수 있는 기술·도구·언어를 적고, 어느 정도 활용했는지 덧붙여 주세요."
          >
            <textarea
              rows={3}
              maxLength={2000}
              value={r.skills}
              onChange={(e) => set("skills", e.target.value)}
              placeholder="예: Figma — 사용자 흐름과 프로토타입 제작"
            />
          </Field>
          <section className="resume-import">
            <h3>이미 정리한 경험 가져오기</h3>
            <p className="helper-text">
              가져온 내용은 이 이력서에서 독립적으로 수정할 수 있어요. 원본
              경험은 그대로 남습니다.
            </p>
            <div className="button-row">
              {projects.map((p) => (
                <Button
                  type="button"
                  variant="secondary"
                  key={p.id}
                  disabled={r.experiences.length >= 15}
                  onClick={() =>
                    set("experiences", [
                      ...r.experiences,
                      {
                        ...experienceEntry(p),
                        description: experienceEntry(p).description.slice(
                          0,
                          4000,
                        ),
                      },
                    ])
                  }
                >
                  <Download size={14} />
                  {p.title}
                </Button>
              ))}
            </div>
            {!projects.length && (
              <p className="helper-text">
                정리한 경험이 아직 없어요. 아래에서 직접 추가하거나
                프로젝트·경험 화면에서 먼저 정리하세요.
              </p>
            )}
          </section>
          {group("experiences", "경험", "프로젝트 · 활동 이름", "내 역할")}
          {group(
            "credentials",
            "자격·수상·교육",
            "자격 · 수상 · 교육명",
            "발급 · 주관 기관",
          )}
        </>
      )}
      {step === 3 && (
        <section className="resume-preview">
          <span className="eyebrow">RESUME PREVIEW</span>
          <ResumeSheet value={r} />
          <p className="helper-text">
            오탈자·기간·연락처를 확인하고 아래 ‘작업본 저장’을 누르세요. 인쇄 /
            PDF로 문서를 내보낼 수 있어요.
          </p>
        </section>
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
          disabled={step === 3}
          onClick={() => setStep(step + 1)}
        >
          다음 단계
          <ArrowRight size={15} />
        </Button>
      </div>
    </div>
  );
}
