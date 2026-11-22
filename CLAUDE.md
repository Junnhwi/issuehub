# CLAUDE.md — IssueHub 작업 지침

요구사항 기준 문서: `ISSUEHUB_BLUEPRINT.md`. 설계 판단은 `docs/decisions.md`에 추가한다.

## 명령
- `npm run dev` / `npm run build`
- 검증: `npm run lint && npm run typecheck && npm test && npm run build`
- 수집: `npm run ingest:dry`(저장 안 함) / `npm run ingest` / `npm run summarize`
- Windows: dev 서버가 켜진 상태에서 `npm run build`를 돌리면 `.next`가 충돌할 수 있으니 먼저 끈다.

## 구조
- `src/app/(site)/*` 페이지(Server Components), `src/app/api/*` 읽기 전용 REST
- `src/lib/data/index.ts#getData()` 하나로 데모(`demo-adapter`)/Supabase(`supabase-adapter`) 전환. 필터·정렬 규칙은 `query.ts`, growth 규칙은 `growth.ts`(SQL view `repository_feed`와 같은 규칙 유지)
- `scripts/` 수집기·요약기(tsx). `server-only` 모듈을 import하지 말 것(Node에서 throw)
- 클라이언트 컴포넌트: 검색/필터/테마/북마크/토스트/그래프 가로 스크롤(`chart-scroller`)만

## 디자인
- UI 작업 시 `.claude/skills/design-taste-frontend-v1/SKILL.md` 규칙을 따른다(다이얼 3/3/7). 설계서와 충돌하면 설계서 우선.
- 리스트는 `ArticleList/ArticleRow`, `RepoList/RepoCard`(구분선). 카드는 위계가 필요한 대표 이슈에만.
- 토픽은 `TopicTag`(색 점 칩), 외부 링크는 `SourceLinks`(원문·HN 토론)를 재사용한다.

## 반드시 지킬 것
- 데모 데이터는 가상임을 표시(`[데모]`, `kind: "demo"`, example.com 링크). 실제 뉴스처럼 만들지 않는다.
- 요약 상태 `pending|completed|failed|skipped`. completed가 아니면 요약을 렌더링하지 않는다.
- Star 증가량은 서로 다른 날짜 스냅샷 2개 이상일 때만. null을 0으로 바꾸지 않는다.
- `SUPABASE_SECRET_KEY`, `ANTHROPIC_API_KEY`, `GITHUB_TOKEN`은 `scripts/`와 서버 코드에서만. `NEXT_PUBLIC_` 금지.
- 공개 쓰기 API 금지. 원격 푸시·배포는 사용자 승인 후에만.
- "use client" 파일에서 상수를 export해 서버에서 쓰지 말 것(클라이언트 참조로 바뀜) → `src/config/*`에 둔다.

## 진행 상황
- 2026-11-19: Stage 1~4 1차 구현 완료(데모 모드 전 화면, API, 수집기 dry-run 실검증, AI 요약기, Actions, 테스트 36개, build 통과). 실 Supabase/Anthropic 연결은 미검증(키 없음).
- 2026-11-19: GitHub 원격 연결, CI 통과. 실제 Supabase 연결 시 42501 발견 → 0002_api_grants.sql 추가(사용자 적용 대기).
- 2026-11-19: Supabase 실데이터 연결·Actions 수집 확인. taste-skill v1 설치·적용(리스트형 재구성, Geist 폰트), 저장소 한국어 요약·summarize --dry-run 추가.
- 2026-11-20: Gemini 무료 번역·요약 운영, 수집 매시 20분(Supabase pg_cron → workflow_dispatch, GitHub 예약 41분은 예비), 화제도(HN 점수·댓글)·댓글순 정렬·노션용 복사 추가. 0004_comments_count.sql은 푸시 전에 적용해야 수집이 깨지지 않음.
- 2026-11-20: Steam 게임 동향(/games, 0006) 추가. Steam 공개 API(featuredcategories, GetMostPlayedGames, IStoreBrowseService/GetItems, GetNumberOfCurrentPlayers) 키 없음. 영어 소개만 AI 번역.
- 2026-11-20: 게임 상세 가격 추이(0007, ITAD API country=KR shop=61, 키 ITAD_API_KEY). 0007 적용 전 푸시 금지(discount_ends_at 열 없으면 게임 upsert 실패).
- 2026-11-22: 품질·보안 개선(D22~D27). 수집기 SSRF 방어(`scripts/lib/safe-fetch.ts`), ingest.yml 입력 검증, CSP·HSTS, 토픽 강/약 키워드, 기사 성격·같은 사건 묶기(렌더 시점), AI 요약 원문 대조(숫자·불확실 표현), 홈 정보 구조, 연속 세일 병합. 0008(선택)은 미적용이어도 동작.
