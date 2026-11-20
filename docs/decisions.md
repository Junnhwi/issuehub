# 설계 결정 기록

### D1. create-next-app 대신 수동 구성 (2026-11-19)
루트에 설계서 파일이 이미 있어 create-next-app이 거부하거나 중첩 폴더를 만들 위험이 있었다. package.json과 설정 파일을 직접 작성했다.

### D2. 버전 선택
Next 16.4, React 19.3, Tailwind 4.3, zod 4, supabase-js 2, @anthropic-ai/sdk 1.10 (설치 시점 최신 안정). TypeScript는 7.x 대신 **5.9**, ESLint는 10 대신 **9** — Next/eslint-config-next와의 호환을 우선했다.

### D3. 데모 데이터는 DB에 쓰지 않는다
데모는 코드 내 고정 데이터(`demo-data.ts`)로 어댑터만 바꿔 제공한다. 실DB에 가짜 행이 섞일 위험을 없앤다. 제목 `[데모]`, 출처 `kind: "demo"`, 링크 example.com, completed 요약에는 "예시 텍스트·AI 생성 아님" 표시.

### D4. 필터·정렬·growth 규칙을 순수 함수로
데모 어댑터와 테스트가 같은 `query.ts`/`growth.ts`를 쓰고, Supabase는 같은 규칙의 SQL view(`repository_feed`)를 쓴다. 규칙을 바꾸면 두 곳을 함께 수정한다.

### D5. cursor = offset
여러 정렬(최신/인기/연관도/growth)을 하나의 방식으로 지원하려고 offset 기반 cursor를 썼다. 데이터가 수만 건 이상이 되면 keyset 페이지네이션으로 바꾼다.

### D6. 연관도 = 키워드 일치 수
“의미 없는 가짜 점수 금지”에 따라 설명 가능한 지표(등록 토픽 키워드 일치 수, 일치 없으면 null)만 쓴다. 인기 지표(HN points)는 `popularity`로 분리했다.

### D7. AI 요약은 별도 스크립트, 웹앱은 키를 갖지 않는다
웹앱(Vercel)에는 secret/Anthropic 키가 없다. 수집·요약은 GitHub Actions에서만. 요약 근거가 80자 미만이면 호출 없이 `skipped`. 모델 출력은 구조화 출력(zod) + 후처리 검증(문장 수 2~4, 개수·길이, 등록 토픽만, HTML 제거). 정책 거절 시 서버 측 fallback 사용.

### D8. 북마크는 localStorage
설계서 MVP 범위. `bookmarks` 테이블과 소유자 RLS는 마이그레이션에 미리 정의했지만 API는 만들지 않았다.

### D9. 다크 테마 기본 + 페인트 전 적용
`<html data-theme>`을 인라인 스크립트로 설정하고 색은 모두 CSS 변수 토큰. 라이트 accent `#0284C7`는 작은 텍스트에서 대비가 부족해 텍스트용 `--accent-fg: #0369A1`을 따로 두었다.

### D10. Data API 권한을 별도 마이그레이션으로 명시 (2026-11-19)
실제 Supabase 프로젝트에 0001을 적용했더니 secret key를 포함한 모든 요청이 `42501 permission denied`였다. 최근 프로젝트는 SQL로 만든 테이블에 API 역할 권한을 자동으로 주지 않는다. 이미 0001을 적용한 DB가 있으므로 0001을 고치지 않고 `0002_api_grants.sql`로 GRANT를 추가했다. 공개 역할(anon/authenticated)에는 SELECT만, 쓰기는 service_role(수집기)만.

### D11. 디자인 스킬은 taste-skill v1, 최신판 2.5는 보류 (2026-11-19)
2.5는 회사 홍보 사이트용으로 한 화면 한 섹션·사진·셰이더·Next.js 정적 export를 강제하고 매 턴 Stop 훅으로 자체 Node 검사기를 실행한다. 정적 export는 API 라우트와 동적 렌더링을 깨므로 IssueHub에 맞지 않는다. 스크립트·훅이 없는 v1(SKILL.md 한 파일)을 커밋 5e08c93 기준으로 고정 설치하고(해시 검증), 다이얼을 대시보드용(3/3/7)으로 적용했다. 설계서와 충돌하는 규칙(Phosphor 아이콘, 상시 무한 애니메이션)은 설계서를 따른다.

### D12. 저장소 한국어 요약은 상태 컬럼 없이 summary_ko로 관리 (2026-11-19)
마이그레이션을 늘리지 않으려고 `summary_ko`의 null(미처리)/""(근거 부족·영구 실패)/문자열(완료)로 구분한다. 일시 오류는 null로 남겨 다음 배치에서 재시도한다. 화면·API에는 ""를 null로 바꿔 내보낸다.

### D13. 토픽 색 점과 원문 링크 노출 (2026-11-19)
토픽을 한눈에 구분하도록 토픽마다 색 점을 두고(`src/config/topics.ts`의 `color`), 칩·사이드바·필터에서 같은 색을 쓴다. 색은 점에만 쓰고 이름을 항상 함께 표시한다(색에만 의존하지 않음, 보라색 제외). 각 이슈 행에는 "원문 · 호스트 ↗" 버튼을 항상 보이게 두고, Hacker News 글은 `source_item_id`로 만든 HN 토론 링크를 함께 둔다. 원문과 토론 URL이 같으면(텍스트 글) 토론 링크는 숨긴다.

### D14. 무료 번역·요약: Gemini 무료 티어 + 배치 처리 (2026-11-19)
무료 대안 중 GitHub Models는 2026-07-30 종료되어 제외했다. Google Gemini는 공식 가격표에 무료 티어(gemini-3.5-flash-lite 등)가 있어 기본 제공자로 삼고, Anthropic은 선택지로 남겼다(`src/lib/ai/provider.ts`, `AI_PROVIDER`). 무료 한도를 아끼려고 기사 8건을 요청 1번에 묶고 요청 사이를 4.5초 띄운다. 제목·발췌 번역은 요약과 분리해 저장한다(`excerpt_ko`, 0003 마이그레이션): 근거가 부족한 글도 번역은 보여 주되 요약은 만들지 않는다. 무료 티어 입력은 Google 제품 개선에 쓰일 수 있으나 보내는 것은 공개 기사 메타데이터뿐이다.

### D15. 수집 주기 1시간, Actions v7 (2026-11-19)
새 글을 더 빨리 보여 주려고 cron을 6시간에서 매시 정각(`0 * * * *`)으로 줄였다. GitHub는 정각 예약이 몰려 수 분~수십 분 늦게 시작될 수 있다. 실행이 겹치면 `concurrency`가 순서대로 대기시킨다. 번역·요약은 이번 달 처리 건수 상한(`AI_MONTHLY_REQUEST_CAP`, 기본 3000)이 그대로 막아 주고, 1회 최대 40건이라 Gemini 무료 한도 안에 든다. Node 20 지원 종료 경고를 없애려고 `actions/checkout`·`actions/setup-node`를 v7(Node 24 런타임)로 올렸다.

### D16. 화제도는 공개 수치의 구간만, 노션은 Markdown 복사로 (2026-11-20)
"얼마나 이슈가 됐나"를 보여 주되 D6(가짜 점수 금지)를 지키려고, 출처가 공개한 숫자(HN 점수·댓글 수)를 그대로 보여 주고 고정 기준으로만 구간을 나눈다(`src/lib/buzz.ts`: 300점/150댓글 이상 큰 화제, 100점/50댓글 이상 화제). 기준은 칩 툴팁과 About에 공개한다. 공식 블로그(RSS)는 조회수·평가를 공개하지 않으므로 비워 둔다. HN 댓글 수는 `descendants`를 `comments_count`(0004)에 저장한다. 노션 연동은 API 키·쓰기 권한 없이 쓰도록 "노션용 복사"(Markdown 노트 초안)로 시작했다. 노션은 붙여 넣을 때 제목·목록·인용을 블록으로 바꾼다.

### D17. 수집 예약은 매시 41분 (2026-11-20)
정각(`0 * * * *`)으로 바꾼 뒤 14번 중 1번만 예약 실행됐다(이전 6시간·17분 설정도 1번 중 0번). GitHub 문서는 매시 정각을 고부하 시간으로 꼽고 이때 예약 실행이 늦어지거나 버려질 수 있다고 한다. 어느 분이든 보장은 없으므로(2026년 커뮤니티 보고: 정각이 아닌 시각도 수 시간 지연) 덜 붐빌 가능성이 큰 시각을 골랐다: 정각과 5분 단위(사람들이 흔히 쓰는 값), 블로그에서 흔히 권장하는 17·23·37분을 피한 41분. 간격은 1시간을 유지한다. 한 번 건너뛰어도 다음 실행이 이어서 모으므로, 간격이 짧을수록 공백이 짧다. 그래도 자주 빠지면 외부 스케줄러(예: Supabase pg_cron)가 `workflow_dispatch`를 호출하는 방식으로 바꾼다.

### D18. 정시 수집은 Supabase pg_cron이 workflow_dispatch로 요청 (2026-11-20)
41분 예약도 첫 두 회차(03:41, 04:41 UTC)가 실행되지 않았다. 워크플로는 active였고 GitHub 장애 공지도 없었다. 즉 이 저장소에서는 GitHub `schedule`을 믿을 수 없다. 수집 코드(Node)는 그대로 Actions에서 돌리고, 시계만 Supabase pg_cron으로 옮겼다: 매시 20분에 pg_net이 GitHub REST API로 `workflow_dispatch`를 보낸다(0005). 토큰은 Fine-grained PAT(issuehub 저장소, Actions 쓰기만)를 Supabase Vault에 두고 저장소에는 커밋하지 않는다. 두 실행이 겹쳐도 `concurrency`로 순서대로 돌고 upsert·pending 처리라 중복 저장·중복 요약이 없으므로 GitHub 예약(41분)은 예비로 남긴다.

### D19. Steam 게임 동향은 공개 API만, 평가는 Steam 값 그대로 (2026-11-20)
"어떤 게임이 만들어지고 유행하는지"를 보려고 Steam 목록 4개(동시접속 상위, 최고 인기, 신규 출시, 곧 출시)를 매 수집마다 가져온다. 키가 필요 없는 공개 엔드포인트만 쓴다: 상점 `featuredcategories`, `ISteamChartsService/GetMostPlayedGames`, 상세는 `IStoreBrowseService/GetItems`로 50개씩 한 번에(한국어 소개·평가 요약·태그·가격·이미지), 현재 동시접속은 `GetNumberOfCurrentPlayers`. 상점의 `appreviews` JSON은 현재 상점 첫 화면으로 리다이렉트되어 쓰지 않았다. 평가는 Steam 표기("매우 긍정적")·긍정 비율·평가 수를 그대로 보여 주고 자체 점수를 만들지 않는다. 출시일은 Steam 상점과 같은 미국 태평양 시간 기준 날짜로 표기한다. 목록 순위는 `games.ranks`(jsonb)에 마지막 수집 기준으로 저장하고, 이번 수집에 없는 게임은 순위를 비워 화면에서 빠지게 한다(행은 남김). 판매 순위·인기 신작·인기 출시 예정은 상점 검색 JSON(`search/results?filter=topsellers|popularnew|popularcomingsoon&json=1`, appid는 이미지 URL에서 추출)을 쓴다. 기본 `featuredcategories` 목록은 10개 안팎이고 "곧 출시"가 다음 날 나오는 작은 게임 위주라 "주목받는 게임"에 맞지 않았다. 검색 JSON을 못 받으면 featuredcategories로 대신한다. 한국어 소개가 없는 게임만 요약 단계에서 AI로 번역한다(`description_ko` null=대기, ''=설명 없음).
