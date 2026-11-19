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
