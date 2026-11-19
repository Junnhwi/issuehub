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
- 클라이언트 컴포넌트: 검색/필터/테마/북마크/토스트만

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
