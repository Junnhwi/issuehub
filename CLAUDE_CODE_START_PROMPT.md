# Claude Code에 붙여넣을 첫 프롬프트

너는 시니어 풀스택 엔지니어이자 프로덕트 디자이너다. 나는 Windows PC에서 Claude Code로 개인 포트폴리오용 실제 웹서비스 `IssueHub`를 개발한다. 현재 작업 디렉터리는 반드시 바탕화면의 `issuehub` 폴더이며, 이 디렉터리 바깥의 파일은 변경하지 마라. 하위 `issuehub/issuehub` 중첩 폴더도 만들지 마라.

## 작업 시작 전
1. 현재 작업 경로, OS/shell, Node/npm/git 버전, 기존 파일을 확인한다. 의도하지 않은 기존 파일은 삭제·덮어쓰기 하지 않는다.
2. 이 프로젝트 루트에 `ISSUEHUB_BLUEPRINT.md`가 있으면 처음부터 끝까지 읽고 이를 제품 요구사항의 기준 문서로 삼는다. 파일이 없으면 아래 핵심 요구사항을 기준으로 진행하고 `docs/architecture.md`에 구체화한다.
3. 최신 공식 문서를 확인하여 Next.js, Supabase, Anthropic SDK의 현재 안정 API에 맞는 구성을 선택한다. 검증하지 못한 버전과 deprecated API는 사용하지 않는다.
4. 짧은 구현 계획과 단계별 체크리스트를 출력한 뒤 실제 파일을 작성하고 실행/테스트한다. 계획만 제시하고 끝내지 마라.
5. 설치, 계정 로그인, 외부 유료 API, Supabase 프로젝트 생성, 배포, GitHub 푸시, 파괴적 명령, 비밀키 입력 등 사용자 조치가 필요한 사항은 명확히 멈춰서 안내한다. 키가 없다는 이유로 로컬 UI 구현을 중단하지 않는다.

## 제품 목표
IssueHub는 코딩/웹 개발/Claude Skills/MCP/AI 활용/GitHub 오픈소스/게임 개발의 최신 소식을 수집하고, 출처를 보여주며, AI가 한국어로 내용을 요약하는 개발자 정보 허브다. 사용자는 검색·필터·원문 보기·북마크를 할 수 있어야 한다. 우선 수집 가능하고 검증된 출처부터 시작하고 추후 Notion 학습 노트 연동을 확장한다.

## 디자인 상세
- 고급 SaaS 개발자 대시보드 느낌. 단순한 블로그 템플릿이나 과장된 광고 랜딩 페이지가 아닌 실제 서비스 UI.
- 기본 다크 테마 + 라이트 테마. 다크 색상 bg `#0B1120`, surface `#111827`, border `#263447`, text `#F8FAFC`, muted `#94A3B8`, accent `#38BDF8`. 라이트는 bg `#F8FAFC`, surface white, text `#0F172A`, accent `#0284C7`.
- 데스크톱: 좌측 236px 사이드바, 64px 상단 검색/테마 바, 본문 max 1320px, 필요한 페이지는 280px 우측 레일. 모바일 단일 열 + 접근성 좋은 네비게이션.
- 컴팩트하고 가독성 좋은 정보 카드(긴 제목 2~3줄, 뱃지, 출처, 시간, 요약 2줄), 8px 간격 체계, 과한 그림자/그라데이션 금지.
- 15~16px 본문, 적절한 line-height, 명확한 시각적 위계, 한국어 중심 UI, 키보드 포커스, 로딩/빈 상태/오류/재시도 지원.
- 공개 사이트에 실제 데이터가 없으면 `데모 데이터` 배지를 표시하고, 근거 없는 뉴스·수치·스타 증가량을 사실처럼 노출하지 않는다.

## 구현할 라우트
- `/`: 오늘의 주요 이슈, 최신 기사, GitHub 주목 저장소, 집계 KPI, 마지막 수집 시각.
- `/discover`: 검색어/카테고리/출처/기간/정렬을 URL 쿼리로 유지하는 기사 탐색.
- `/articles/[id]`: 제목·원제·출처·게시시각·원문 링크·한국어 요약·핵심 내용·활용·주의사항·북마크.
- `/github`: 저장소 목록, 언어/정렬, Stars/Forks, 관측된 Star 변화량(스냅샷 없으면 `집계 중`).
- `/topics/[slug]`: AI·LLM, Claude Skills, MCP/Agents, GitHub, Frontend, Backend, Game Dev 토픽.
- `/saved`: 우선 localStorage 기반 작동하는 북마크(기사/저장소), 로그인·Notion은 2차.
- `/about`: 출처 정책, 업데이트 주기, AI 요약의 한계, 서비스 설명.
- `/settings`: 2차. 테마 전환은 초기 버전부터 지원.

## 기술 및 구현
- Next.js App Router, TypeScript, Tailwind, 필요한 경우 shadcn/ui, Lucide; 가능한 Server Components 우선.
- Supabase PostgreSQL을 실제 데이터 저장소로 사용할 수 있도록 `supabase/migrations/0001_initial_schema.sql`, 서버 전용/공개 DB 클라이언트, data repository 구현.
- 초기 로컬 개발은 `DEMO_MODE=true`에서 API 키/DB 없이도 모든 페이지가 정상 작동하도록 별도 demo adapter 사용.
- TypeScript 수집 작업: GitHub REST API repository search, Hacker News 공개 API, *실제 피드 URL을 검증한 공식 RSS*; timeout/backoff, batch cap, 중복제거 및 upsert, sync_logs, 안전한 실패 처리.
- 기사 데이터: 출처, source item ID, canonical/원문 URL, 제목·한국어 제목, 발췌, 요약 상태, 게시/수집 시각, topic 등. GitHub 데이터: github_id, full_name, language, stars_total, forks, pushed_at, daily snapshots.
- 관련 DB 테이블: sources, articles, topics, article_topics, repositories, repo_snapshots, sync_runs. 2차 bookmarks는 Supabase Auth user id 기반 RLS. MVP 북마크는 localStorage만 사용.
- 기사 AI 요약: 옵션으로 Anthropic SDK 사용. 출처에서 제공된 실제 텍스트만 근거로 2~4문장 요약, key points, why it matters, use cases, caveats 생성. Zod 결과 검증, 서버 전용 env, batch 제한, 실패상태 표시. `ANTHROPIC_API_KEY`가 없으면 가짜 AI 결과 생성 금지.
- AI 요약에 대한 API 사용 비용은 Claude Code 구독과 별도임을 README에 명시.
- GitHub Actions `ingest.yml`: UTC cron 예시 `17 */6 * * *`와 `workflow_dispatch`; secrets 없으면 친절한 실패 로그, 공개 무인증 관리용 수집 API 생성 금지.
- GitHub Stars 총합과 기간 증가량은 다르다. 데이터가 없으면 증가량 0이라고 주장하지 말고 `집계 중`을 표시. GitHub 공식 Trending API라고 오표기하지 않는다.
- 출처의 공신력과 인기 점수를 분리한다. 뉴스 전문을 무단 재배포하지 않고 허용된 메타데이터/요약과 원문 링크 위주로 노출한다.

## API 계약
성공 `{data,meta:{nextCursor,asOf}}`, 실패 `{error:{code,message}}`; Zod 입력 검증, `limit` 최대 50, 일관된 400/404/500 처리. `GET /api/health`, `/api/articles`, `/api/articles/[id]`, `/api/repos`, `/api/repos/[id]`, `/api/topics`, `/api/sources`, `/api/stats`를 구현한다. 기사 목록 query는 `q,topic,source,tier,period,sort,cursor,limit`을 지원하고, 저장소는 `q,language,topic,sort,cursor,limit`을 지원한다. 쿼리 필터/페이지네이션이 UI와 실제로 연동되어야 한다.

## 디렉터리 원칙
`src/app/(site)` 페이지, `src/app/api` 라우트, `src/components/layout|articles|github|ui`, `src/lib/data|db|ingestion|ai|validation|bookmarks`, `src/types`, `src/config`, `scripts/ingest.ts`, `scripts/sources/{github,hackernews,rss}.ts`, `supabase/migrations`, `.github/workflows`, `docs`, `tests`, `.env.example`, `CLAUDE.md`, `README.md`를 기본으로 한다. 현재 프로젝트에 맞춰 조정하되 역할을 명확히 유지한다.

## 개발 진행 방법
Stage 1: 프로젝트 스캐폴딩, 디자인 시스템, 모든 주요 페이지, 실제로 작동하는 mock 검색/필터/테마/북마크, 로딩/에러/반응형을 먼저 구현하고 `npm run dev`로 확인한다.
Stage 2: DB migration, 실제 수집 어댑터, REST API, 실제 데이터/데모 데이터 전환, 중복제거 및 오류 처리.
Stage 3: AI 요약 옵션, GitHub Actions 자동 수집, 보안/테스트/배포 문서.
Stage 4: lint, typecheck, test, build 수행하여 오류를 수정하고 README에 실제 실행 절차와 미구현 사항을 남긴다.

규칙: 외부 계정이나 키가 필요하면 `.env.example`에 빈 placeholder로 남겨 두고, 사용자가 값을 채우기 전에는 데모 모드로 계속 구현한다. 컴파일만 되는 가짜 버튼/필터가 아니라 클릭과 탐색이 작동해야 한다. 반복 실행에도 안전하게 한다. 테스트가 실패하면 가능한 범위에서 해결하고, 해결하지 못한 항목은 이유를 적는다. 디자인 완성도를 우선시하되 생산용 보안 기본값을 희생하지 않는다.

## 결과 보고
완료 시 수정/생성한 핵심 파일, 실행한 명령과 테스트 결과, `http://localhost:3000`에서 확인할 화면, 필요한 `.env.local` 값과 취득 방법, 남은 기능과 다음 작업 3가지를 **한국어**로 간결히 보고한다. 원격 푸시와 실제 배포는 내 명시적 허가 전에는 수행하지 마라.

지금 현재 작업 폴더부터 확인하고 구현을 시작해라.
