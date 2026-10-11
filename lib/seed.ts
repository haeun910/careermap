import type { Workspace } from "./types";
function dateIn(days: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
export function emptyWorkspace(name = "나"): Workspace {
  return {
    profile: {
      name,
      type: "신입 취업",
      background: "이공계",
      role: "",
      bio: "",
    },
    projects: [],
    companies: [],
    jobs: [],
    documents: [],
    tasks: [],
    questions: [],
    practices: [],
    selfAnalysis: "",
    portfolio: {
      title: `${name}의 포트폴리오`,
      subtitle: "작은 문제에서 시작해, 더 나은 경험을 만듭니다.",
      about: "",
      projectIds: [],
      email: "",
      showEmail: false,
      projectOverrides: {},
    },
  };
}
export function sampleWorkspace(): Workspace {
  const s = emptyWorkspace("지민");
  return {
    ...s,
    profile: {
      name: "지민",
      type: "신입 취업",
      background: "인문·사회계",
      role: "프로덕트 디자이너",
      bio: "사용자의 일상에 더 나은 경험을 만드는 프로덕트 디자이너입니다.",
    },
    projects: [
      {
        id: "p1",
        title: "일상을 바꾸는 금융 경험",
        category: "UX/UI 디자인",
        period: "2026.03 — 2026.06",
        role: "UX 리서치 · 프로덕트 디자인",
        problem:
          "처음 자산 관리를 시작하는 사용자가 금융 용어와 복잡한 화면 때문에 어려움을 겪었습니다.",
        action:
          "사용자 12명을 인터뷰하고 핵심 사용 흐름을 설계했습니다. 두 차례 사용성 테스트를 거쳐 정보 구조와 온보딩을 개선했습니다.",
        result: "테스트 참여자의 과제 완료율을 58%에서 83%로 개선했습니다.",
        learning:
          "사용자 언어로 정보를 설명하는 것이 시작의 부담을 줄인다는 점을 배웠습니다.",
        tags: ["UX 리서치", "Figma", "사용성 테스트"],
        link: "",
        privateNote: "샘플 프로젝트입니다.",
      },
      {
        id: "p2",
        title: "지역과 사람을 잇는 서비스",
        category: "서비스 기획",
        period: "2026.01 — 2026.03",
        role: "서비스 기획 · UI 디자인",
        problem:
          "지역의 작은 모임을 찾고 참여하는 과정이 여러 채널에 흩어져 있었습니다.",
        action:
          "참여자 여정을 정리하고 모임 탐색·신청을 하나의 흐름으로 구성했습니다.",
        result: "프로토타입을 제작하고 8명의 사용자에게 피드백을 받았습니다.",
        learning:
          "서비스를 설계할 때 발견부터 참여 이후까지 전체 경험을 살펴야 합니다.",
        tags: ["서비스 기획", "프로토타이핑"],
        link: "",
        privateNote: "",
      },
      {
        id: "p3",
        title: "취향을 발견하는 큐레이션",
        category: "사이드 프로젝트",
        period: "2025.10 — 2025.12",
        role: "기획 · 디자인",
        problem: "원하는 전시를 쉽게 발견하기 어려웠습니다.",
        action: "관심 주제와 위치를 활용한 탐색 화면을 설계했습니다.",
        result: "핵심 화면 14개와 클릭형 프로토타입을 완성했습니다.",
        learning: "추천 이유를 보여주면 사용자의 선택을 도울 수 있습니다.",
        tags: ["UI 디자인", "큐레이션"],
        link: "",
        privateNote: "",
      },
    ],
    companies: [
      {
        id: "c1",
        name: "네이버",
        industry: "인터넷 · 플랫폼",
        color: "#03a764",
        overview:
          "샘플: 다양한 디지털 서비스를 제공하는 플랫폼 기업입니다. 실제 분석을 위해 공식 자료를 등록해 주세요.",
        website: "https://www.navercorp.com",
        priority: "높음",
      },
      {
        id: "c2",
        name: "카카오",
        industry: "IT · 라이프스타일",
        color: "#f5cf42",
        overview:
          "샘플 기업입니다. 관심 기업의 실제 자료를 입력해 준비할 수 있습니다.",
        website: "https://www.kakaocorp.com",
        priority: "보통",
      },
      {
        id: "c3",
        name: "토스",
        industry: "핀테크 · 금융",
        color: "#3478ee",
        overview:
          "샘플 기업입니다. 실제 공고와 경험을 연결해 지원을 준비해 보세요.",
        website: "https://toss.im",
        priority: "높음",
      },
    ],
    jobs: [
      {
        id: "j1",
        companyId: "c1",
        title: "프로덕트 디자이너",
        deadline: dateIn(7),
        status: "준비 중",
        description:
          "샘플 공고: 사용자 문제를 정의하고 UX/UI를 설계합니다. 사용자 리서치 경험, Figma를 활용한 프로토타이핑, 협업과 문제 해결 역량을 갖춘 지원자를 찾습니다. 포트폴리오와 이력서 제출이 필요합니다.",
        source: "",
        projectIds: ["p1"],
        analysis: "",
        analyzedAt: "",
      },
      {
        id: "j2",
        companyId: "c2",
        title: "서비스 기획 인턴",
        deadline: dateIn(12),
        status: "관심",
        description:
          "샘플 공고: 사용자 경험 기반 서비스 기획과 팀 협업을 담당합니다. 서비스 기획서 및 프로토타입 경험을 우대합니다.",
        source: "",
        projectIds: ["p2"],
        analysis: "",
        analyzedAt: "",
      },
      {
        id: "j3",
        companyId: "c3",
        title: "UX 디자이너",
        deadline: dateIn(4),
        status: "지원 완료",
        description:
          "샘플 공고: 금융 서비스의 사용 흐름을 설계하고 사용성 테스트를 수행합니다. 문제 정의와 개선 과정이 담긴 포트폴리오를 제출해 주세요.",
        source: "",
        projectIds: ["p1"],
        analysis: "",
        analyzedAt: "",
      },
    ],
    tasks: [
      {
        id: "t1",
        text: "네이버 지원동기 초안 작성하기",
        done: false,
        category: "자기소개서",
        jobId: "j1",
        deadline: dateIn(0),
      },
      {
        id: "t2",
        text: "금융 프로젝트의 개인 기여 정리하기",
        done: false,
        category: "프로젝트",
        jobId: "",
        deadline: dateIn(0),
      },
      {
        id: "t3",
        text: "관심 기업의 채용 요건 확인하기",
        done: true,
        category: "기업분석",
        jobId: "j2",
        deadline: dateIn(0),
      },
      {
        id: "t4",
        text: "포트폴리오에 담을 프로젝트 선택하기",
        done: false,
        category: "포트폴리오",
        jobId: "",
        deadline: dateIn(1),
      },
    ],
    portfolio: {
      title: "지민의 포트폴리오",
      subtitle: "작은 문제에서 시작해, 더 나은 경험을 만듭니다.",
      about:
        "사용자의 이야기에 귀 기울이고, 발견한 문제를 명료한 경험으로 풀어냅니다.",
      projectIds: ["p1", "p2"],
      email: "",
      showEmail: false,
      projectOverrides: {},
    },
    documents: [],
    questions: [],
    practices: [],
  };
}
