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
