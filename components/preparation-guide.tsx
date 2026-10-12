"use client";
import { ArrowRight, Check, Compass, BookOpen } from "lucide-react";
import { Button } from "./ui";
import { answeredCount, allReflectionQuestions } from "@/lib/reflection";
import type { Workspace, View } from "@/lib/types";
export default function PreparationGuide({
  state: s,
  isSample,
  guest,
  onNavigate,
  onProfile,
  onStart,
}: {
  state: Workspace;
  isSample: boolean;
  guest: boolean;
  onNavigate: (view: View) => void;
  onProfile: () => void;
  onStart: () => void;
}) {
  const experienced = s.profile.type === "경력 이직";
  const evidence =
    s.profile.background === "이공계"
      ? "연구·개발·설계·실험"
      : s.profile.background === "인문·사회계" ||
          s.profile.background.includes("인문")
        ? "조사·기획·콘텐츠·대외활동"
        : "프로젝트·업무·활동";
  const steps = [
    {
      title: "준비 방향부터 정해요",
      description: experienced
        ? "이직 이유, 목표 직무, 다음 회사에서 기대하는 조건을 적어 보세요."
        : "관심 있는 직무와 지금까지 해 본 활동을 떠올려 보세요. 아직 직무가 미정이어도 괜찮아요.",
      output: "나의 준비 유형과 목표 직무",
      done: !!s.profile.role.trim(),
      action: "프로필 정하기",
      view: "self" as View,
      profile: true,
    },
    {
      title: "질문으로 나를 돌아봐요",
      description:
        "컬처핏·잡핏 질문과 회사 상황 선택에 답해 보세요. 선호하는 환경과 탐색할 업무를 정리할 수 있어요.",
      output: "선호 환경·업무와 회사에 확인할 질문",
      done:
        answeredCount(s.reflection?.answers || {}) ===
        allReflectionQuestions.length,
      action: "자기분석 시작",
      view: "self" as View,
    },
    {
      title: experienced
        ? "업무 경험을 하나씩 풀어 써요"
        : "작은 경험 하나부터 기록해요",
      description:
        evidence +
        " 중 하나를 골라 문제 → 내 역할 → 행동 → 결과 순서로 적어 보세요. 수치가 없으면 실제로 달라진 점을 적으면 돼요.",
      output: "다른 서류에도 쓸 수 있는 경험 카드",
      done: s.projects.some((p) => p.action.trim()),
      action: "경험 정리하기",
      view: "projects" as View,
    },
    {
      title: "공고 없이 마스터 서류를 만들어요",
      description:
        "이력서는 기본 정보·학력·경력·경험을 항목별로 채우세요. 자소서는 실제 문항을 넣거나 직무 역량·문제 해결·협업 연습 문항을 고르고, 질문마다 답변을 준비해요.",
      output: "기업이 정해지기 전의 공통 원본",
      done: s.documents.some((d) => !d.jobId && d.text.trim()),
      action: "마스터 서류 만들기",
      view: "documents" as View,
    },
    {
      title: "공통 면접 답변을 준비해요",
      description:
        "공통 답변 보관함에 자기소개, 강점, 협업·실패 경험 질문을 모으세요. 상황 → 행동 → 결과 → 배운 점으로 답변을 정리해요.",
      output: "다시 활용할 질문·답변 라이브러리",
      done: s.questions.some((q) => !q.jobId && q.answer.trim()),
      action: "공통 면접 준비",
      view: "interview" as View,
    },
    {
      title: "지원할 기업이 생기면 연결해요",
      description:
        "기업과 공고를 등록하고 마스터 서류·답변을 해당 지원 공간으로 복사하세요. 기업 분석과 실제 요구 역량에 맞게 복사본을 다듬어요.",
      output: "기업별로 독립된 지원 자료",
      done: s.jobs.some((j) =>
        s.documents.some((d) => d.jobId === j.id && d.text.trim()),
      ),
      action: "희망기업 보기",
      view: "companies" as View,
      optional: true,
    },
    {
      title: "보여줄 경험으로 포트폴리오를 만들어요",
      description:
        "프로젝트를 골라 공개할 제목·성과와 순서를 조정하세요. 미리보기로 개인정보와 공개 범위를 확인한 후 게시해요.",
      output: "선택한 프로젝트만 담은 나의 사이트",
      done: !!s.portfolio.projectIds.length && !!s.portfolio.about.trim(),
      action: "포트폴리오 준비",
      view: "portfolio" as View,
      optional: true,
    },
  ];
  const completed = isSample ? 0 : steps.filter((x) => x.done).length;
  return (
    <div className="guide-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">START WITH A SMALL STEP</span>
          <h1>처음 시작하는 커리어 준비 가이드</h1>
          <p>
            한 번에 모두 준비하지 않아도 괜찮아요. 지금 할 수 있는 한 가지부터
            시작해요.
          </p>
        </div>
      </div>
      <section className="guide-welcome panel">
        <span className="guide-icon">
          <BookOpen size={26} />
        </span>
        <div>
          <span className="eyebrow">
            {s.profile.type} · {s.profile.role || "직무 탐색 중"}
          </span>
          <h2>
            {experienced
              ? "쌓아 온 경험을 다음 기회로 연결해요."
              : "경험이 적어도, 준비는 시작할 수 있어요."}
          </h2>
          <p>
            아래 순서는 추천 흐름이에요. 공고가 없어도 자기분석, 서류, 면접
            준비를 먼저 할 수 있습니다.
          </p>
          {isSample && (
            <p className="guide-sample">
              지금 보이는 자료는 샘플입니다. 아래 준비 현황에는 샘플을 포함하지
              않아요.
            </p>
          )}
          <div className="button-row">
            <Button onClick={isSample ? onStart : onProfile}>
              {isSample ? "내 공간 만들기" : "내 준비 방향 확인"}
              <ArrowRight size={15} />
            </Button>
            <span className="guide-progress">
              {completed} / {steps.length}개 준비 자료 채움
            </span>
          </div>
        </div>
      </section>
      <ol className="guide-steps">
        {steps.map((step, i) => (
          <li className="panel guide-step" key={step.title}>
            <span
              className={
                "guide-step-number " + (!isSample && step.done ? "done" : "")
              }
            >
              {!isSample && step.done ? (
                <Check size={19} />
              ) : (
                String(i + 1).padStart(2, "0")
              )}
            </span>
            <div>
              <h2>
                {step.title}
                {step.optional && <span className="label-pill">필요할 때</span>}
              </h2>
              <p>{step.description}</p>
              <small>남는 자료 · {step.output}</small>
            </div>
            <Button
              variant="secondary"
              onClick={step.profile ? onProfile : () => onNavigate(step.view)}
            >
              {step.action}
              <ArrowRight size={14} />
            </Button>
          </li>
        ))}
      </ol>
      <section className="panel guide-help">
        <h2>사용하면서 궁금할 수 있어요</h2>
        <details>
          <summary>공고나 희망기업을 아직 몰라도 사용할 수 있나요?</summary>
          <p>
            네. 마스터 서류와 공통 면접 답변은 기업과 공고 없이 저장할 수
            있어요. 지원할 곳이 생기면 기업별 공간에 복사해서 수정하세요. 원본은
            그대로 보관됩니다.
          </p>
        </details>
        <details>
          <summary>신입인데 프로젝트나 업무 경험이 없어요.</summary>
          <p>
            수업 과제, 동아리, 아르바이트, 봉사, 개인적인 개선 활동도 경험이 될
            수 있어요. 활동 전체보다 내가 맡은 역할과 실제 행동을 적어 주세요.
          </p>
        </details>
        <details>
          <summary>프로젝트나 경험에 무엇을 써야 할지 모르겠어요.</summary>
          <p>
            프로젝트 추가에서 ‘질문으로 시작’을 선택하세요. 경험 유형부터 내가
            한 일과 결과까지 하나씩 물어봐요. 모르는 선택 항목은 건너뛰고, 이전
            질문으로 돌아가 답변을 고칠 수 있어요. 마지막에 답변을 확인하고
            ‘프로젝트 완성하기’를 누르면 AI가 하나의 초안으로 정리합니다. 완성된
            내용을 수정한 뒤 ‘경험 저장’을 눌러 주세요. AI 없이 답변으로 완성할
            수도 있습니다.
          </p>
        </details>
        <details>
          <summary>경험을 증명할 사진이나 파일도 저장할 수 있나요?</summary>
          <p>
            경험 편집 화면의 ‘경험 증빙 자료’에서 사진과 PDF를 첨부하세요. 새
            경험은 ‘저장하고 증빙 첨부’를 누르면 바로 올릴 수 있어요.
            PNG·JPG·WebP·PDF를 파일당 2 MB, 경험당 10개, 내 공간 전체 20 MB까지
            저장합니다. 사진은 미리보기로 확인하고 원본 파일을 다운로드할 수
            있어요. 첨부 자료는 본인만 볼 수 있으며 AI·공개 포트폴리오·지원
            서류에 자동으로 전달되지 않습니다.
          </p>
        </details>
        <details>
          <summary>컬처핏·잡핏 결과는 어떻게 활용하나요?</summary>
          <p>
            답변으로 현재 선호를 돌아보는 도구예요. 검증된 채용·심리검사나 특정
            회사의 적합도 판정은 아닙니다. 결과의 확인 질문을 채용 담당자에게
            묻거나 작은 실무 경험으로 선호를 확인해 보세요. 자기점검은 메뉴 없는
            전용 화면에서 이어서 답할 수 있어요. 22문항을 마친 뒤 선택한 경험
            최대 3개와 함께 어필 역량·서류 표현·면접 흐름·다음 준비 과제를 AI로
            정리할 수 있습니다. 시작 전에 전송에 동의하면 완료 후 자동 분석하고,
            결과는 개인 공간에 저장됩니다.
          </p>
        </details>
        <details>
          <summary>작성한 자료는 어디에 저장되나요?</summary>
          <p>
            검사 답변은 서버에 자동 저장됩니다. 서류 항목과 문항별 답변, 면접
            답변은 화면의 저장 버튼을 눌러 주세요. 프로젝트·경험 초안도 ‘경험
            저장’을 눌러야 보관됩니다.{" "}
            {guest
              ? "현재는 임시 공간으로, 이 브라우저의 쿠키가 필요합니다. 계정을 만들면 다른 기기에서도 로그인해 자료를 이어갈 수 있어요."
              : "개인 공간은 로그인하면 다시 열 수 있습니다."}{" "}
            화면 상단의 저장 상태도 확인해 주세요.
          </p>
        </details>
        <details>
          <summary>AI를 꼭 사용해야 하나요?</summary>
          <p>
            질문 요약과 기록·편집은 AI 없이 사용할 수 있어요. AI 버튼을 누르면
            안내된 자료가 Groq에 전달되며, 제안은 직접 검토한 후 반영합니다.
            검사 완료 후 자동 분석은 시작 화면에서 동의한 경우에만 진행해요.
            AI가 제안한 역량과 표현은 실제 경험·수치·기간과 대조해 확인하세요.
          </p>
        </details>
        <details>
          <summary>포트폴리오를 공개하면 모든 기록이 보이나요?</summary>
          <p>
            선택한 프로젝트와 공개용 소개만 게시됩니다. 자기분석 답변·비공개
            메모·증빙 첨부·서류·면접 기록은 포함하지 않아요. 프로젝트 본문에
            직접 적은 민감한 정보는 게시 전 미리보기에서 확인해 주세요.
          </p>
        </details>
      </section>
      <div className="note-box">
        <Compass size={20} />
        <p>
          추천 순서를 모두 완료해야 지원할 수 있는 것은 아니에요. 내 일정과
          목표에 맞춰 필요한 단계부터 시작하세요.
        </p>
      </div>
    </div>
  );
}
