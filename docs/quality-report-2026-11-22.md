# IssueHub 품질·보안 개선 결과 보고서 (2026-11-22)

범위: 기존 기능을 보존하면서 P0(정확성·보안)을 우선 고치고, P1 중 근거가 확인된 항목만 개선했다. 실데이터(Supabase 기사 191건, 가격 기록 971건)를 읽기 전용으로 조회해 규칙을 평가했다. 데이터는 쓰거나 지우지 않았다. 외부 AI API는 호출하지 않았다.

## 1. 개선 전 문제점과 근거

| 등급 | 문제 | 근거 |
| --- | --- | --- |
| P0 확인됨 | 수집기 SSRF | `hackernews.ts`가 HN의 임의 URL을 `redirect: follow`로 그대로 요청했다. 주소·리다이렉트·DNS 검사가 없어 Actions 러너에서 메타데이터 주소(169.254.169.254)나 내부 주소로 요청이 갈 수 있었다. |
| P0 확인됨 | Actions 입력값 셸 삽입 | `ingest.yml`이 `${{ inputs.source }}`를 `run:`에 직접 넣었다. 실행 권한은 저장소 쓰기 권한자뿐이라 실제 위험은 낮다. |
| P0 확인됨 | 토픽 오분류 | `agent`, `database`, `game`, `browser` 하나로 태깅되었다. 예: "FBI Criminal Database Hacked" → Backend, "UN autonomous weapons" → MCP·Agents. 191건 중 23건이 개발 주제가 아닌데 태깅되어 있었다. |
| P0 확인됨 | "검증을 통과한 AI 요약" 표현 | 실제 검증은 문장 수·길이뿐이라 사실 검증으로 오해될 수 있었다. |
| P0 확인됨 | 요약·번역의 원문 대조 없음 | 기존 요약 137건에 새 규칙을 돌린 결과: 제목 번역에서 연도 누락 2건(예: "Nasdaq erases 2026 gains"에서 2026이 빠짐), 불확실 표현 누락 2건(예: "Alleged AI Chip Smuggling"이 "연루되다"로 단정됨), 원문에 없는 숫자 14건(일부는 단위 환산). |
| P0 확인됨 | 근거 충분성을 길이로만 판단 | 80자 이상이면 통과해 "x"×80 같은 무의미한 텍스트나 GitHub 기본 문구도 요약 근거가 될 수 있었다. |
| P0 확인됨 | HN을 발행처처럼 표시 | HN 글의 출처가 "Hacker News · 커뮤니티"로만 보여 실제 발행처(예: gov.br, cnn.com)가 드러나지 않았다. |
| P0 확인됨 | 같은 사건 반복 노출 | 실데이터에서 "FBI 데이터베이스 해킹" 3건이 서로 다른 매체로 따로 노출되었다. |
| P1 확인됨 | 세일 횟수 과다 집계 | `salePeriods`가 할인 중 할인율 변경(-30%→-50%)을 별도 세일로 셌다. 60개 게임 중 2개가 해당되었다. |
| P1 확인됨 | "역대 최저가" 과장 | KR 기록은 2024-12부터라 실제로는 기록 범위 안의 최저가다. |
| P1 확인됨 | Star 증가량 기간 불명확 | 배지에 "+N 관측"만 보여 실제 관측 일수를 알 수 없었다(툴팁에만 있음). |
| P1 확인됨 | 홈의 운영 지표 | 수집 수·요약 완료 수 띠와 수집 출처 목록이 콘텐츠보다 먼저 보였다. |
| P1 확인됨 | 모바일 탭 6개 | 360px에서 탭당 60px, 글자 11px였다. Topics는 필터·메뉴와 겹쳤다. |
| 보안 양호 | 키 노출 | 비밀 키는 `scripts/`와 `provider.ts`에서만 쓰고 `NEXT_PUBLIC_` 사용은 없다. Git 이력에 키 패턴 0건, `npm audit`(운영 의존성) 0건, RLS는 anon/authenticated 읽기 전용이며 쓰기는 service_role뿐이다. |

## 2. 수정 내용과 파일

**보안**
- 신규 [`scripts/lib/safe-fetch.ts`](../scripts/lib/safe-fetch.ts)
  - http/https와 기본 포트만 허용, 자격 증명이 든 URL 거부.
  - 10진·16진·IPv4-mapped 표기를 포함해 사설·루프백·링크 로컬·메타데이터·예약 대역 IP 차단. IPv6는 전역 대역만 허용하고 6to4·Teredo는 차단.
  - 리다이렉트는 매번 재검사, 연결 시점 DNS lookup 검사로 DNS rebinding 차단.
  - 64KB·6초·Content-Type 제한.
- [`scripts/sources/hackernews.ts`](../scripts/sources/hackernews.ts): 메타 설명 요청을 safe-fetch로 교체.
- [`scripts/sources/rss.ts`](../scripts/sources/rss.ts): 피드 응답 5MB 상한.
- [`.github/workflows/ingest.yml`](../.github/workflows/ingest.yml): 입력값을 환경 변수로 넘기고 slug 형식만 허용.
- [`next.config.ts`](../next.config.ts): CSP(외부 스크립트·플러그인·프레임 삽입·외부 폼 전송 차단, 이미지는 https 허용), HSTS, Permissions-Policy 추가.
- [`src/lib/ai/summarize.ts`](../src/lib/ai/summarize.ts): 프롬프트 데이터 태그 무력화 대상을 모든 태그로 확대.

**콘텐츠 정확성**
- [`src/config/topics.ts`](../src/config/topics.ts), [`src/lib/ingestion/normalize.ts`](../src/lib/ingestion/normalize.ts): 강한 단어·제목 전용 단어·범용 단어 점수제. 제목 가중치를 두고 2점 이상일 때만 태깅. 문장 끝 마침표 처리 버그("in Rust.")도 수정.
- 신규 [`src/lib/article-kind.ts`](../src/lib/article-kind.ts): 기사 성격(발표·도구·튜토리얼·보안·연구) 규칙 분류. 기본값인 뉴스는 표시하지 않는다.
- 신규 [`src/lib/same-event.ts`](../src/lib/same-event.ts): 같은 사건 묶기. 조건은 다른 도메인, 72시간 이내, 숫자·버전·CVE 일치, 제목 Jaccard ≥ 0.5.
- [`article-row.tsx`](../src/components/articles/article-row.tsx), [`article-card.tsx`](../src/components/articles/article-card.tsx), [`articles/[id]/page.tsx`](../src/app/(site)/articles/[id]/page.tsx): HN 글은 발행처 도메인과 "HN에서 발견"으로 표시, 성격 레이블, "같은 소식 다른 출처" 링크.

**번역·요약**
- [`src/lib/ai/summarize.ts`](../src/lib/ai/summarize.ts) 프롬프트 v2
  - 용어 정책: 고유명사·식별자는 그대로, 통용 한국어 기술 용어 목록.
  - 숫자는 원문 값 그대로.
  - 불확실성 표현의 대응 번역(reportedly→"~로 알려졌다", claims→"~라고 주장한다", may→"~일 수 있다").
  - 단정·과장 금지, 활용 예시는 제안형으로.
- [`src/lib/ai/schema.ts`](../src/lib/ai/schema.ts) 원문 대조
  - 요약의 숫자 대조. 영어 숫자 단어·월 이름은 허용.
  - 보도·주장 표현 유지 여부.
  - 제목의 버전·연도·CVE 보존.
  - 제목의 불확실성·질문형 보존.
  - 근거 충분성을 정보량 기준으로 판단.
- [`scripts/summarize.ts`](../scripts/summarize.ts)
  - 재시도는 작은 묶음(배치 1/4)으로.
  - 모델·프롬프트 버전 기록. 0008 열이 없으면 기록만 건너뛰고 경고를 남긴다.
- 신규 [`supabase/migrations/0008_summary_provenance.sql`](../supabase/migrations/0008_summary_provenance.sql) (선택, 미적용).
- [`summary-panel.tsx`](../src/components/articles/summary-panel.tsx)
  - 핵심 요약과 "개발자에게 중요한 이유"를 먼저 보여 준다.
  - 기술 포인트·"활용 아이디어 · AI 제안"·주의점은 "자세히 보기" 안에 둔다. 없는 항목은 숨긴다.

**UX·데이터 표현**
- [`page.tsx`(홈)](../src/app/(site)/page.tsx)
  - 운영 지표 띠와 수집 출처 목록 제거.
  - 순서: 화제의 이슈 → 최근 주목받는 GitHub 저장소 → 최신 이슈.
  - 같은 사건은 묶어 보여 주고, 화제의 이슈와 겹치는 글은 최신 이슈에서 뺀다.
- [`about/page.tsx`](../src/app/(site)/about/page.tsx)
  - 데이터 상태(수집·저장소·요약 수)와 출처별 마지막 수집 시각.
  - 자동 대조가 팩트체크가 아니라는 설명.
- [`nav-links.tsx`](../src/components/layout/nav-links.tsx): 하단 탭 5개, 글자 12px.
- [`discover/page.tsx`](../src/app/(site)/discover/page.tsx): 결과가 없을 때 "검색어만 남기고 필터 해제"·"모두 초기화"와 대체 검색 안내.
- [`repo-card.tsx`](../src/components/github/repo-card.tsx): Star 증가 배지에 실제 관측 일수.
- [`games.ts`](../src/lib/games.ts), [`games/[appid]/page.tsx`](../src/app/(site)/games/[appid]/page.tsx), [`price-chart.tsx`](../src/components/games/price-chart.tsx)
  - 연속 세일 병합과 할인율 범위 표시.
  - "기록상 최저가", 기록 시작일 표시.
  - Steam 현재값과 ITAD 기록 구분, 종료 예정일과 실제 종료 구분.
  - "현재 동시접속" 명시.
- 문서: `docs/decisions.md` D22~D27, README(0008), CLAUDE.md 진행 상황.

## 3. 사용자가 체감할 UX 개선

- 홈을 열면 운영 숫자 대신 바로 오늘의 이슈와 뜨는 저장소가 보인다. 같은 사건은 한 줄로 묶이고 다른 출처는 링크로 남는다.
- HN 글의 실제 발행처(도메인)가 보이고, 글 성격(발표·보안·튜토리얼 등)을 제목 옆에서 알 수 있다.
- 기사 상세에서 핵심 요약과 중요한 이유만 먼저 읽고, 필요하면 펼쳐 볼 수 있다.
- 모바일 하단 탭이 5개로 줄어 누르기 쉬워졌다(높이 64px, 360px에서 가로 넘침 없음).
- 검색 결과가 없을 때 무엇을 풀면 되는지 안내한다.

## 4. 콘텐츠 정확성과 번역·요약 품질

- 토픽: 191건 재분류 시 23건이 태그 없음으로 바뀌었다(대부분 비개발 글). 그 밖의 변경은 주로 잘못 붙은 토픽 제거였다.
- 같은 사건: 실데이터 1건 묶음(3개 매체), 오탐 0건. 서로 다른 버전·CVE와 같은 블로그의 연재 글은 묶지 않는다.
- 요약 저장 조건: 형식 검사에 원문 대조를 더했다. 어긋나면 요약은 저장하지 않고 제목·발췌 번역만 남긴다(`failed`, 사유 코드 기록). 근거 부족(`skipped`)과 실패(`failed`)는 계속 구분한다.
- **기존 요약에는 소급 적용되지 않는다.** 새로 수집되는 글부터 적용된다. 다시 만들려면 0008을 적용한 뒤 그 파일의 주석 SQL을 쓰면 된다(대상 수를 먼저 확인).

## 5. 보안 점검 결과

**확인된 취약점(수정함)**
- 수집기 SSRF
- Actions 입력 셸 삽입: 쓰기 권한자만 실행 가능해 위험은 낮다.

**문제없음**
- 비밀 키 클라이언트 노출 없음
- Git 이력 키 패턴 0건
- `.env*`는 `.env.example`만 추적
- RLS 읽기 전용, 공개 쓰기 API 없음
- `dangerouslySetInnerHTML`은 고정 테마 스크립트 1곳뿐
- 외부 링크는 모두 `noopener noreferrer`
- API 파라미터 zod 검증
- 오류 응답은 코드만 반환
- `npm audit` 0건

**잠재 개선(미조치)**
- CSP의 `script-src 'unsafe-inline'`: Next.js 인라인 스크립트 때문에 필요하다. nonce로 바꾸려면 전 페이지를 동적 렌더로 바꿔야 해서 보류했다.
- 공개 API 요청 제한 없음: 읽기 전용이고 Vercel 플랫폼 보호가 있어 보류했다. 남용이 보이면 Vercel Firewall 규칙 추가를 권한다.
- `fast-xml-parser` 엔티티 처리: 등록된 공식 피드만 파싱하고 5MB 상한이 있다.

## 6. 테스트 결과

- `npm run lint` 통과, `npm run typecheck` 통과, `npm run build` 통과.
- `npm test`: **166개 통과**(기존 59개 → 166개). 추가된 테스트:
  - SSRF 44개: 차단 대역, 우회 표기, 프로토콜·포트·자격 증명
  - 번역·요약 원문 대조 평가 세트 30건 + 도우미 5개
  - 토픽·성격·같은 사건 26개
  - 연속 세일 병합 1개
- 실제 네트워크 확인
  - safe-fetch로 example.com 읽기 성공.
  - http→https 리다이렉트 추적 성공.
  - `localtest.me`(DNS가 127.0.0.1로 풀림)는 차단.
- 브라우저(프로덕션 빌드, localhost:3100)
  - 콘솔 오류 0건, CSP·HSTS 헤더 확인, Steam 이미지 정상 로드.
  - 360px에서 가로 넘침 없음, 하단 탭 5개.
  - 요약 "자세히 보기" 펼침 동작 확인.
  - 게임 상세의 "기록상 최저가"·세일 표 확인.

## 7. 적용하지 않은 제안과 이유

- **AI 토픽 분류**: 규칙 개선만으로 오분류 대부분이 사라졌다. 기사마다 호출이 늘어 무료 한도를 소모하므로 넣지 않았다.
- **모델 비교 평가(실제 호출)**: 외부 API 호출이라 승인이 필요하다. 이번에는 같은 30건 세트로 "출력 검사 규칙"만 자동 평가했다. 한국어 자연스러움과 핵심 누락은 사람 검토가 필요하다.
- **기사 성격·같은 사건의 DB 저장, Discover 묶기**: 렌더 시점 계산이면 마이그레이션이 필요 없다. Discover는 서버 페이지네이션이라 페이지마다 묶음이 달라진다.
- **그래프 터치 툴팁·확대**: 클라이언트 코드가 늘어난다. 같은 정보는 아래 표에 있어 안내 문구로 대신했다. 기간 선택도 가로 스크롤로 충분하다고 판단했다.
- **저장소 상세 페이지·README 수집**: GitHub API 호출이 저장소 수만큼 늘어난다. 현재 목록 정보(설명 요약·언어·Star·관측 증가)로 우선 충분하다고 판단했다.
- **트렌드 브리핑·출처 비교·관심 토픽 개인화(P2)**
  - 같은 사건 묶기가 출처 비교의 첫 단계다.
  - 브리핑은 하루 이슈 수가 적어(24시간 약 30건) 홈 "화제의 이슈"와 겹친다.
  - 개인화는 북마크 사용량을 본 뒤 결정하기를 권한다.
- **Topics 페이지 삭제**: 토픽별 설명·저장소 목록이 있어 유지했다. 모바일 하단 탭에서만 뺐다.

## 8. 향후 확장할 가치가 있는 기능

1. 0008 적용 후 이전 프롬프트로 만든 요약 재생성. 원문 대조 효과를 실제 데이터로 확인할 수 있다.
2. 같은 사건 묶음을 상세 페이지 "다른 출처" 섹션으로 확장(최근 7일 범위 조회).
3. 관심 토픽 우선 정렬(localStorage). 북마크 저장소를 재사용하면 된다.
4. 주간 변화 추적: 지난주 대비 새로 등장한 저장소. `repo_snapshots`가 2주 이상 쌓인 뒤 가능하다.

## 9. 배포 전 확인 사항

1. **푸시·배포는 승인 후에 진행한다.** 이번 변경은 아직 커밋하지 않았다.
2. 필수 마이그레이션 없음. 0008은 선택이며, 적용하지 않아도 요약기는 동작한다(기록만 건너뜀).
3. 새 환경 변수 없음.
4. 배포 후 확인할 것:
   - 다음 정시 수집(매시 20분)에서 HN 수집 건수가 0이 아닌지.
   - 요약 로그의 "실패"가 크게 늘지 않았는지. 원문 대조로 일부 요약이 번역만으로 남는 것은 의도한 동작이다.
   - Steam 이미지와 외부 링크가 정상인지(CSP).
5. `docs/worklog-notion.md`와 `.claude/launch.json`(프로덕션 미리보기 설정 추가)은 커밋할지 정한다.
