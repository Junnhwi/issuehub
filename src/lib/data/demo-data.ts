import type { Article, Repository, Source, SourceRef, SummaryStatus } from "@/types";
import { computeGrowth } from "./growth";
import { scoreRelevance } from "@/lib/ingestion/normalize";

/*
 * 데모 데이터 — 전부 가상의 예시다. 실제 기사/저장소가 아니며 링크는 example.com을 가리킨다.
 * "completed" 상태의 요약 텍스트도 AI가 실제 기사를 분석한 결과가 아니라 UI 시연용으로 사람이 쓴 예시다.
 * 날짜는 서버 시작 시각 기준 상대값이라 기간 필터를 시연할 수 있다.
 */

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const BOOT = Date.now();
const hoursAgo = (h: number) => new Date(BOOT - h * 3600_000).toISOString();
const daysAgoDate = (d: number) => new Date(BOOT - d * 86400_000).toISOString().slice(0, 10);

export const DEMO_SOURCES: Source[] = [
  { id: uuid(901), slug: "demo-official", name: "데모 공식 블로그", kind: "demo", tier: "official", homepageUrl: "https://example.com/official", feedUrl: null, enabled: true, lastFetchedAt: hoursAgo(1) },
  { id: uuid(902), slug: "demo-community", name: "데모 커뮤니티 포럼", kind: "demo", tier: "community", homepageUrl: "https://example.com/community", feedUrl: null, enabled: true, lastFetchedAt: hoursAgo(1) },
  { id: uuid(903), slug: "demo-blog", name: "데모 개인 기술 블로그", kind: "demo", tier: "independent", homepageUrl: "https://example.com/blog", feedUrl: null, enabled: true, lastFetchedAt: hoursAgo(3) },
];

const ref = (slug: string): SourceRef => {
  const s = DEMO_SOURCES.find((x) => x.slug === slug)!;
  return { slug: s.slug, name: s.name, kind: s.kind, tier: s.tier, homepageUrl: s.homepageUrl };
};

interface DemoSummary {
  summaryKo: string;
  keyPoints: string[];
  whyItMatters: string;
  useCases: string[];
  caveats: string;
}

interface DemoArticleInput {
  title: string;
  titleKo: string | null;
  excerpt: string | null;
  source: string;
  topics: string[];
  hours: number;
  popularity: number | null;
  status: SummaryStatus;
  summary?: DemoSummary;
}

const ARTICLES: DemoArticleInput[] = [
  {
    title: "[Demo] Kestrel LLM SDK 2.0 introduces structured output validation",
    titleKo: "[데모] 가상의 Kestrel LLM SDK 2.0, 구조화 출력 검증 기능 도입",
    excerpt: "Fictional release note used to demonstrate IssueHub's article layout. Kestrel LLM SDK 2.0 adds schema-validated responses and retry hooks.",
    source: "demo-official",
    topics: ["ai-llm", "backend"],
    hours: 2,
    popularity: 412,
    status: "completed",
    summary: {
      summaryKo: "가상의 Kestrel LLM SDK 2.0 릴리스 노트를 예로 든 데모 요약입니다. 응답을 스키마로 검증하는 기능과 실패 시 재시도 훅이 추가되었다는 내용을 다룹니다.",
      keyPoints: ["응답 스키마 검증 기능 추가", "검증 실패 시 재시도 훅 제공", "이전 버전과의 호환 모드 유지"],
      whyItMatters: "LLM 응답을 애플리케이션 데이터로 바로 쓰려면 형식 검증이 필수이기 때문에, 이런 기능이 있으면 파싱 오류 처리 코드가 줄어듭니다.",
      useCases: ["요약 결과를 DB에 저장하기 전 검증", "폼 자동 채우기 결과 검증"],
      caveats: "데모용 가상 기사이므로 실제 SDK 기능과 무관합니다.",
    },
  },
  {
    title: "[Demo] Writing your first agent skill: a step-by-step walkthrough",
    titleKo: "[데모] 첫 번째 에이전트 스킬 작성하기: 단계별 안내",
    excerpt: "A fictional tutorial post showing how a skill folder with instructions and scripts can be packaged for a coding agent.",
    source: "demo-blog",
    topics: ["claude-skills", "mcp-agents"],
    hours: 5,
    popularity: 188,
    status: "completed",
    summary: {
      summaryKo: "코딩 에이전트용 스킬 폴더를 구성하는 과정을 설명하는 가상의 튜토리얼입니다. 지침 파일과 보조 스크립트를 함께 묶어 재사용 가능한 작업 단위로 만드는 흐름을 보여 줍니다.",
      keyPoints: ["스킬은 지침 문서와 스크립트를 묶은 폴더", "트리거 설명을 구체적으로 작성", "작은 예제로 먼저 검증"],
      whyItMatters: "반복되는 팀 작업을 문서화된 스킬로 만들면 에이전트가 같은 품질로 작업을 재현할 수 있습니다.",
      useCases: ["코드 리뷰 체크리스트 자동화", "릴리스 노트 작성 절차 표준화"],
      caveats: "데모용 가상 글입니다. 실제 사용법은 공식 문서를 확인하세요.",
    },
  },
  {
    title: "[Demo] Example Protocol Server reaches v1 with streaming tool results",
    titleKo: "[데모] 예시 프로토콜 서버 v1 출시, 스트리밍 도구 결과 지원",
    excerpt: "Fictional announcement: an example MCP-style server adds streamed tool results and per-tool permissions.",
    source: "demo-official",
    topics: ["mcp-agents"],
    hours: 9,
    popularity: 256,
    status: "completed",
    summary: {
      summaryKo: "가상의 MCP 스타일 서버가 v1에 도달했다는 데모 공지입니다. 도구 실행 결과를 스트리밍으로 전달하고, 도구별 권한을 설정할 수 있게 되었다는 내용입니다.",
      keyPoints: ["도구 결과 스트리밍", "도구 단위 권한 설정", "v0 설정 파일 마이그레이션 가이드 제공"],
      whyItMatters: "에이전트가 오래 걸리는 작업을 수행할 때 중간 결과를 볼 수 있으면 디버깅과 사용자 경험이 좋아집니다.",
      useCases: ["대용량 로그 검색 도구", "사내 문서 검색 연동"],
      caveats: "데모용 가상 기사입니다.",
    },
  },
  {
    title: "[Demo] Show Forum: I built a tiny WebGPU particle playground",
    titleKo: "[데모] 커뮤니티 공유: 작은 WebGPU 파티클 놀이터를 만들었습니다",
    excerpt: "Fictional community post about a browser particle sandbox using compute shaders.",
    source: "demo-community",
    topics: ["game-dev", "frontend"],
    hours: 14,
    popularity: 97,
    status: "pending",
  },
  {
    title: "[Demo] Postgres partial indexes in practice",
    titleKo: "[데모] 실무에서 쓰는 Postgres 부분 인덱스",
    excerpt: "Fictional blog post: when partial indexes help, how to check the planner uses them, and common pitfalls with nullable columns.",
    source: "demo-blog",
    topics: ["backend"],
    hours: 20,
    popularity: 143,
    status: "completed",
    summary: {
      summaryKo: "부분 인덱스가 효과적인 상황과 쿼리 플래너가 실제로 인덱스를 사용하는지 확인하는 방법을 다룬 가상의 블로그 글입니다.",
      keyPoints: ["조건이 자주 고정되는 쿼리에 유리", "EXPLAIN으로 사용 여부 확인", "NULL 허용 컬럼 조건 주의"],
      whyItMatters: "인덱스 크기를 줄이면서 자주 쓰는 조회를 빠르게 만들 수 있습니다.",
      useCases: ["soft delete 테이블의 활성 행 조회", "상태가 pending인 작업 큐 조회"],
      caveats: "데모용 가상 글입니다.",
    },
  },
  {
    title: "[Demo] Component library migrates to CSS cascade layers",
    titleKo: "[데모] 컴포넌트 라이브러리, CSS cascade layers로 전환",
    excerpt: "Fictional changelog: a UI kit adopts @layer to make overrides predictable.",
    source: "demo-official",
    topics: ["frontend"],
    hours: 30,
    popularity: 64,
    status: "failed",
  },
  {
    title: "[Demo] Ask Forum: How do you evaluate RAG answers?",
    titleKo: "[데모] 질문: RAG 답변 품질은 어떻게 평가하나요?",
    excerpt: "Fictional discussion thread comparing human review, reference answers and LLM-as-judge setups.",
    source: "demo-community",
    topics: ["ai-llm"],
    hours: 40,
    popularity: 321,
    status: "completed",
    summary: {
      summaryKo: "RAG 시스템의 답변 품질을 평가하는 방법을 묻는 가상의 커뮤니티 토론입니다. 사람 검토, 기준 답안 비교, LLM 판정 방식의 장단점이 오갑니다.",
      keyPoints: ["기준 답안 세트를 먼저 마련", "검색 품질과 생성 품질을 분리 측정", "LLM 판정은 사람 검토로 보정"],
      whyItMatters: "평가 기준 없이 프롬프트를 바꾸면 개선인지 퇴보인지 알 수 없습니다.",
      useCases: ["사내 문서 Q&A 봇 회귀 테스트"],
      caveats: "데모용 가상 토론이며 특정 결론을 대표하지 않습니다.",
    },
  },
  {
    title: "[Demo] Open source maintainers share funding experiences",
    titleKo: "[데모] 오픈소스 메인테이너들의 후원 경험 공유",
    excerpt: "Fictional roundup of how small open-source projects handle sponsorship and burnout.",
    source: "demo-blog",
    topics: ["github-oss"],
    hours: 52,
    popularity: 75,
    status: "skipped",
  },
  {
    title: "[Demo] Example Git hosting adds merge queue analytics",
    titleKo: "[데모] 예시 Git 호스팅, 머지 큐 분석 기능 추가",
    excerpt: "Fictional product update: dashboards for merge queue wait time and flaky checks.",
    source: "demo-official",
    topics: ["github-oss"],
    hours: 70,
    popularity: 58,
    status: "pending",
  },
  {
    title: "[Demo] Building a turn-based game loop with an ECS",
    titleKo: "[데모] ECS로 턴제 게임 루프 만들기",
    excerpt: "Fictional devlog about structuring turn order, actions and undo with an entity-component-system.",
    source: "demo-blog",
    topics: ["game-dev"],
    hours: 90,
    popularity: 41,
    status: "completed",
    summary: {
      summaryKo: "엔티티-컴포넌트-시스템 구조로 턴 순서, 행동, 되돌리기를 설계한 가상의 개발 일지입니다.",
      keyPoints: ["턴 상태를 별도 리소스로 관리", "행동을 명령 객체로 기록", "되돌리기는 명령 역적용으로 구현"],
      whyItMatters: "게임 로직을 데이터 중심으로 나누면 테스트와 기능 추가가 쉬워집니다.",
      useCases: ["보드게임 디지털화", "전략 게임 프로토타입"],
      caveats: "데모용 가상 글입니다.",
    },
  },
  {
    title: "[Demo] Prompt caching patterns for chat apps",
    titleKo: "[데모] 채팅 앱을 위한 프롬프트 캐싱 패턴",
    excerpt: "Fictional engineering note on keeping system prompts stable so cached prefixes are reused.",
    source: "demo-community",
    topics: ["ai-llm", "claude-skills"],
    hours: 120,
    popularity: 205,
    status: "pending",
  },
  {
    title: "[Demo] Server components data fetching checklist",
    titleKo: "[데모] 서버 컴포넌트 데이터 패칭 체크리스트",
    excerpt: "Fictional checklist: colocate queries, avoid waterfalls, stream slow sections.",
    source: "demo-blog",
    topics: ["frontend"],
    hours: 150,
    popularity: null,
    status: "completed",
    summary: {
      summaryKo: "서버 컴포넌트에서 데이터를 가져올 때 확인할 항목을 정리한 가상의 체크리스트입니다. 요청 폭포를 피하고 느린 영역은 스트리밍하라는 내용이 중심입니다.",
      keyPoints: ["병렬로 가져올 수 있는 요청은 함께 시작", "느린 영역은 Suspense로 분리", "클라이언트 컴포넌트는 꼭 필요한 곳에만"],
      whyItMatters: "초기 화면 표시 속도와 서버 비용에 직접 영향을 줍니다.",
      useCases: ["대시보드 첫 화면 최적화"],
      caveats: "데모용 가상 글입니다.",
    },
  },
  {
    title: "[Demo] Agent sandbox escapes: lessons from a red-team exercise",
    titleKo: "[데모] 에이전트 샌드박스 탈출: 레드팀 훈련에서 얻은 교훈",
    excerpt: "Fictional write-up on permission boundaries for tool-using agents.",
    source: "demo-community",
    topics: ["mcp-agents", "ai-llm"],
    hours: 200,
    popularity: 290,
    status: "failed",
  },
  {
    title: "[Demo] Rust-based job queue hits 1.0",
    titleKo: "[데모] Rust 기반 작업 큐 1.0 출시",
    excerpt: "Fictional release: durable jobs backed by Postgres with retries and dead-letter handling.",
    source: "demo-official",
    topics: ["backend", "github-oss"],
    hours: 260,
    popularity: 133,
    status: "pending",
  },
  {
    title: "[Demo] Notes on accessible data tables",
    titleKo: "[데모] 접근성 있는 데이터 테이블 노트",
    excerpt: null,
    source: "demo-blog",
    topics: ["frontend"],
    hours: 400,
    popularity: null,
    status: "skipped",
  },
  {
    title: "[Demo] Shader graph tool goes open source",
    titleKo: null,
    excerpt: "Fictional announcement of an open-sourced node-based shader editor.",
    source: "demo-community",
    topics: ["game-dev", "github-oss"],
    hours: 600,
    popularity: 112,
    status: "pending",
  },
  {
    title: "[Demo] Coding agent hooks recipes collection",
    titleKo: "[데모] 코딩 에이전트 훅 레시피 모음",
    excerpt: "Fictional collection of hook scripts for formatting, linting and notifications in an agent workflow.",
    source: "demo-blog",
    topics: ["claude-skills"],
    hours: 800,
    popularity: 66,
    status: "completed",
    summary: {
      summaryKo: "에이전트 작업 흐름에서 포맷팅, 린트, 알림을 자동으로 실행하는 훅 스크립트를 모은 가상의 글입니다.",
      keyPoints: ["파일 편집 후 포맷터 실행", "명령 실행 전 위험 명령 차단", "작업 종료 알림"],
      whyItMatters: "반복적인 확인 작업을 자동화하면 에이전트 결과물의 일관성이 높아집니다.",
      useCases: ["팀 공통 코딩 규칙 강제"],
      caveats: "데모용 가상 글입니다. 실제 훅 설정 방식은 공식 문서를 확인하세요.",
    },
  },
];

export const DEMO_ARTICLES: Article[] = ARTICLES.map((a, i) => ({
  id: uuid(i + 1),
  title: a.title,
  titleKo: a.titleKo,
  excerpt: a.excerpt,
  summaryKo: a.summary?.summaryKo ?? null,
  keyPoints: a.summary?.keyPoints ?? [],
  whyItMatters: a.summary?.whyItMatters ?? null,
  useCases: a.summary?.useCases ?? [],
  caveats: a.summary?.caveats ?? null,
  summaryStatus: a.status,
  originalUrl: `https://example.com/demo/articles/${i + 1}`,
  source: ref(a.source),
  topics: a.topics,
  popularity: a.popularity,
  relevanceScore: scoreRelevance(`${a.title} ${a.excerpt ?? ""}`),
  publishedAt: hoursAgo(a.hours + 1),
  fetchedAt: hoursAgo(a.hours),
  summarizedAt: a.status === "completed" ? hoursAgo(a.hours - 0.5) : null,
}));

interface DemoRepoInput {
  name: string;
  description: string;
  language: string;
  topics: string[];
  stars: number;
  forks: number;
  pushedDays: number;
  /** 과거 스타 수 [며칠 전, 스타]. 비어 있으면 스냅샷 1개뿐 → 집계 중 */
  history: [number, number][];
}

const REPOS: DemoRepoInput[] = [
  { name: "demo-org/agent-kit", description: "가상의 에이전트 도구 모음 (데모)", language: "TypeScript", topics: ["mcp-agents", "ai-llm"], stars: 18420, forks: 1210, pushedDays: 0, history: [[7, 17650], [3, 18010]] },
  { name: "demo-org/skill-recipes", description: "에이전트 스킬 예제 모음 (데모)", language: "Python", topics: ["claude-skills"], stars: 6240, forks: 402, pushedDays: 1, history: [[6, 5480]] },
  { name: "demo-org/tiny-llm-eval", description: "작은 LLM 평가 하네스 (데모)", language: "Python", topics: ["ai-llm"], stars: 3310, forks: 188, pushedDays: 2, history: [[7, 3190]] },
  { name: "demo-org/protocol-server-starter", description: "프로토콜 서버 스타터 템플릿 (데모)", language: "Go", topics: ["mcp-agents", "backend"], stars: 2875, forks: 240, pushedDays: 0, history: [] },
  { name: "demo-org/edge-ui", description: "가상의 React 컴포넌트 라이브러리 (데모)", language: "TypeScript", topics: ["frontend"], stars: 24100, forks: 2050, pushedDays: 3, history: [[5, 23980]] },
  { name: "demo-org/pg-queue", description: "Postgres 기반 작업 큐 (데모)", language: "Rust", topics: ["backend"], stars: 4120, forks: 150, pushedDays: 4, history: [[7, 4010], [1, 4100]] },
  { name: "demo-org/voxel-engine", description: "브라우저 복셀 게임 엔진 (데모)", language: "C++", topics: ["game-dev"], stars: 9050, forks: 610, pushedDays: 6, history: [] },
  { name: "demo-org/shader-nodes", description: "노드 기반 셰이더 편집기 (데모)", language: "TypeScript", topics: ["game-dev", "frontend"], stars: 1520, forks: 95, pushedDays: 10, history: [[4, 1380]] },
  { name: "demo-org/oss-health", description: "오픈소스 저장소 건강도 리포트 CLI (데모)", language: "Go", topics: ["github-oss"], stars: 870, forks: 44, pushedDays: 15, history: [[7, 869]] },
  { name: "demo-org/rag-starter", description: "검색 증강 생성 예제 앱 (데모)", language: "Python", topics: ["ai-llm", "backend"], stars: 12780, forks: 1630, pushedDays: 2, history: [] },
];

export const DEMO_SNAPSHOTS: Record<string, { capturedDate: string; starsCount: number }[]> = {};

export const DEMO_REPOS: Repository[] = REPOS.map((r, i) => {
  const id = uuid(500 + i);
  const snapshots = [
    ...r.history.map(([d, stars]) => ({ capturedDate: daysAgoDate(d), starsCount: stars })),
    { capturedDate: daysAgoDate(0), starsCount: r.stars },
  ];
  DEMO_SNAPSHOTS[id] = snapshots;
  return {
    id,
    githubId: 9_000_000 + i,
    fullName: r.name,
    htmlUrl: `https://example.com/demo/${r.name}`,
    description: r.description,
    summaryKo: null,
    language: r.language,
    topics: r.topics,
    githubTopics: [],
    starsTotal: r.stars,
    forksTotal: r.forks,
    pushedAt: hoursAgo(r.pushedDays * 24 + 2),
    repoCreatedAt: hoursAgo(24 * 400 + i * 30),
    lastSyncedAt: hoursAgo(1),
    growth: computeGrowth(snapshots),
    isDemo: true,
  };
});

export const DEMO_LAST_SYNC = hoursAgo(1);
