# IssueHub

> Discover · Understand · Learn — 개발 트렌드를 출처와 함께 모으고, 근거가 있을 때만 한국어 AI 요약을 붙이는 개발자 정보 허브

Next.js App Router 기반 포트폴리오 프로젝트입니다. API 키나 DB 없이도 `DEMO_MODE=true`로 전체 화면이 동작하며, 데모 데이터는 화면 곳곳에 **데모 데이터**로 명확히 표시됩니다(가상의 예시이며 실제 뉴스가 아님).

## 주요 기능

| 영역 | 내용 |
|---|---|
| 화면 | `/` 대시보드, `/discover` 이슈 탐색, `/articles/[id]` 상세, `/github` 저장소, `/topics`·`/topics/[slug]`, `/saved`, `/about` |
| 디자인 | 다크(기본)/라이트 테마(localStorage 유지), 데스크톱 236px 사이드바·태블릿 아이콘 사이드바·모바일 하단 내비, Pretendard 폰트, 스켈레톤·빈 상태·오류 재시도·토스트, `Ctrl/Cmd+K` 검색 |
| 탐색 | 검색어·토픽·출처·출처 유형·기간·정렬을 URL 쿼리에 저장(공유/뒤로가기), cursor 페이지네이션 |
| 북마크 | localStorage 기반 기사/저장소 저장, 탭·검색·토픽 필터·삭제 |
| 데이터 | Supabase PostgreSQL 스키마·RLS·view, 데모/실데이터 어댑터 자동 전환 |
| 수집 | GitHub Search API, Hacker News API, 검증된 RSS(GitHub Blog, Next.js Blog, Cloudflare Blog), URL 정규화·중복 제거·재실행 안전 upsert, 일별 Star 스냅샷 |
| AI | 서버 전용 Anthropic 요약(구조화 출력 + zod 검증 + 재시도), 근거 부족 시 `요약 없음`, 키 없으면 no-op |
| 자동화 | GitHub Actions 6시간 주기 수집 + 수동 실행, CI(lint/typecheck/test/build) |
| API | `GET /api/health · articles · articles/:id · repos · repos/:id · topics · sources · stats` ([docs/api.md](docs/api.md)) |

## 빠른 시작 (Windows PowerShell)

```powershell
cd $HOME\Desktop\issuehub
npm install
Copy-Item .env.example .env.local   # 이미 있으면 생략
npm run dev
```

브라우저에서 <http://localhost:3000> 을 엽니다. 기본값 `DEMO_MODE=true`라 외부 계정이 필요 없습니다.

## 스크립트

| 명령 | 설명 |
|---|---|
| `npm run dev` | 개발 서버 |
| `npm run build` / `npm start` | 프로덕션 빌드 / 실행 |
| `npm run lint` / `npm run typecheck` / `npm test` | ESLint / `tsc --noEmit` / Vitest |
| `npm run ingest:dry` | 외부 API에서 실제로 수집하되 **저장하지 않음**(키 불필요) |
| `npm run ingest` | 수집 후 Supabase에 저장(secret key 필요) |
| `npm run summarize` | pending 기사 AI 요약(활성화 + API 키 필요, 없으면 아무것도 안 함) |

## 실데이터 모드 설정 (사용자가 직접 해야 하는 단계)

1. **Supabase 프로젝트 생성** — <https://supabase.com> 에서 새 프로젝트를 만듭니다.
2. **스키마 적용** — Dashboard → SQL Editor에서 아래 두 파일을 **순서대로** 붙여 넣고 실행합니다. (Supabase CLI를 쓰면 `supabase db push`)
   1. [`0001_initial_schema.sql`](supabase/migrations/0001_initial_schema.sql) — 테이블·RLS·view·seed
   2. [`0002_api_grants.sql`](supabase/migrations/0002_api_grants.sql) — Data API 접근 권한. 최근 Supabase 프로젝트는 이 권한을 자동으로 주지 않아, 빠뜨리면 모든 요청이 `42501 permission denied`로 실패합니다.
3. **키 확인** — Project Settings → API Keys에서 Project URL, Publishable key, Secret key를 복사합니다.
4. **GitHub 토큰(선택, 권장)** — GitHub Settings → Developer settings → Fine-grained token(권한 없음, public repo 읽기만)을 발급합니다. 없으면 검색 API 한도가 분당 10회로 줄어듭니다.
5. **`.env.local` 작성**

   ```dotenv
   DEMO_MODE=false
   NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   SUPABASE_SECRET_KEY=sb_secret_...        # 서버/수집기 전용. 절대 NEXT_PUBLIC_ 접두사 금지
   GITHUB_TOKEN=github_pat_...
   ```

6. `npm run ingest` → `npm run dev`. 사이드바 하단이 **실데이터 모드**로 바뀝니다.

### AI 요약 (선택, 유료)

Anthropic API는 **Claude Code 구독과 별도로 과금**됩니다. <https://console.anthropic.com> 에서 API 키를 발급한 뒤:

```dotenv
AI_SUMMARIZATION_ENABLED=true
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=            # 비우면 claude-opus-5-5
AI_SUMMARY_BATCH_LIMIT=10   # 1회 실행당 최대 건수
AI_MONTHLY_REQUEST_CAP=1000 # 월 최대 시도 건수
```

- 요약은 출처가 제공한 제목·발췌·공개 설명(meta description)만 근거로 합니다. 발췌가 80자 미만이면 AI를 호출하지 않고 `skipped`로 둡니다.
- 정책상 거절(`refusal`) 시 서버 측 fallback(`fallbacks: "default"`)으로 대체 모델이 처리합니다. 원치 않으면 [`src/lib/ai/summarize.ts`](src/lib/ai/summarize.ts)에서 `betas`/`fallbacks` 두 줄을 지우세요.

### GitHub Actions 설정

저장소 Settings → Secrets and variables → Actions:

| 종류 | 이름 | 필수 |
|---|---|---|
| Secret | `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SECRET_KEY` | 수집에 필수 |
| Secret | `ANTHROPIC_API_KEY` | AI 요약 시 |
| Variable | `AI_SUMMARIZATION_ENABLED=true`, `ANTHROPIC_MODEL`, `AI_SUMMARY_BATCH_LIMIT`, `AI_MONTHLY_REQUEST_CAP`, `INGEST_BATCH_LIMIT` | 선택 |

`GITHUB_TOKEN`은 Actions가 자동 제공하는 토큰을 사용합니다. Actions 탭 → **Ingest** → *Run workflow*로 수동 실행할 수 있습니다.

## 배포 (Vercel)

1. GitHub에 푸시 후 Vercel에서 Import (Framework: Next.js).
2. Environment Variables에 `DEMO_MODE`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` 만 등록합니다. 웹앱은 secret key나 Anthropic 키가 **필요 없습니다**(수집·요약은 GitHub Actions에서만 실행).
3. 데이터가 없는 상태로 공개하려면 `DEMO_MODE=true`로 두세요. 데모 배지가 모든 화면에 표시됩니다.

## 설계 원칙

- 실데이터와 데모 데이터를 명확히 구분하고, 실데이터가 없을 때 오늘의 뉴스처럼 보이게 하지 않습니다.
- AI가 분석하지 않은 글에는 요약을 만들지 않습니다(`분석 대기`/`요약 실패`/`요약 없음` 상태 구분).
- Star 증가량은 IssueHub가 직접 기록한 **서로 다른 날짜의 스냅샷 2개 이상**이 있을 때만 표시하고, 아니면 `집계 중`.
- "GitHub 공식 Trending"이라 표기하지 않고 "IssueHub 주목 저장소"라 부릅니다.
- 출처 유형(공식/커뮤니티/개인)은 신뢰도 점수가 아닙니다. 숫자 신뢰도 점수를 만들지 않습니다.
- 공개 쓰기/수집 API를 만들지 않습니다. 쓰기는 secret key를 가진 CLI/Actions만 합니다.

자세한 내용: [docs/architecture.md](docs/architecture.md) · [docs/data-sources.md](docs/data-sources.md) · [docs/decisions.md](docs/decisions.md) · [docs/roadmap.md](docs/roadmap.md)

## 트러블슈팅

| 증상 | 해결 |
|---|---|
| 화면에 계속 데모 배지가 보임 | `.env.local`의 `DEMO_MODE=false`와 Supabase URL/Publishable key 확인 후 dev 서버 재시작 |
| “데이터를 불러오지 못했습니다” | 마이그레이션 적용 여부, Publishable key 확인. 서버 로그에는 `DB_ERROR:<code>`만 남습니다 |
| 오류 코드 `42501` | `0002_api_grants.sql` 미실행 |
| 오류 코드 `PGRST125` | `NEXT_PUBLIC_SUPABASE_URL`이 `https://<ref>.supabase.co` 형식이 아님(끝의 `/rest/v1` 제거) |
| 오류 코드 `PGRST205` | `0001_initial_schema.sql` 미실행 |
| `npm run ingest`가 즉시 종료 | `SUPABASE_SECRET_KEY` 누락. 키 없이 확인하려면 `npm run ingest:dry` |
| GitHub 수집 개수가 적음 | `GITHUB_TOKEN` 미설정 시 rate limit으로 일부 쿼리만 실행됩니다 |
| 요약이 계속 `분석 대기` | `AI_SUMMARIZATION_ENABLED=true` + `ANTHROPIC_API_KEY` 설정 후 `npm run summarize` |
