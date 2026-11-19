# 데이터 소스

| slug | 종류 | 출처 유형 | 수집 내용 | 확인 |
|---|---|---|---|---|
| `github` | GitHub REST Search API | official | 토픽별 쿼리(최근 30일 push, Star>200)로 저장소 메타데이터, 일별 Star 스냅샷 | 2026-11-19 dry-run 성공 |
| `hackernews` | HN Firebase API | community | topstories 상위 글 중 개발 토픽 키워드가 있는 글. 제목·링크·점수, 연결 페이지의 meta description(앞 64KB만) | 2026-11-19 dry-run 성공 |
| `github-blog` | RSS `https://github.blog/feed/` | official | 제목·링크·발행일·description | 2026-11-19 200 응답 확인 |
| `nextjs-blog` | RSS `https://nextjs.org/feed.xml` | official | 동일 | 2026-11-19 200 응답 확인 |
| `cloudflare-blog` | RSS `https://blog.cloudflare.com/rss/` | official | 동일 | 2026-11-19 200 응답 확인 |

## 정책
- 공식 RSS/API가 실제로 응답하는 것만 등록한다. RSS가 없는 사이트는 크롤링하지 않는다.
- 본문 전문을 저장·재배포하지 않는다. 제목, 공개 설명/발췌(최대 600자), 링크만.
- 새 RSS 추가: 피드 URL이 200과 RSS/Atom XML을 반환하는지 확인 → `sources` 테이블에 insert(`kind='rss'`) → 이 표에 기록.

## 수집 규칙
- 타임아웃 10초, 5xx/429/네트워크 오류는 지수 backoff로 최대 2회 재시도. 4xx는 즉시 실패.
- 중복 판정: `normalized_url`(추적 파라미터·fragment·기본 포트·끝 슬래시 제거, 나머지 쿼리 정렬 유지).
- upsert는 요약 필드·`fetched_at`·`summary_status`를 덮어쓰지 않는다 → 재실행해도 요약과 최초 수집 시각 유지.
- 한 소스 실패는 다른 소스 수집을 막지 않고, 기존 데이터를 지우지 않는다. 실패는 `sync_runs.error_code`에 기록.
- GitHub Search API: 쿼리 사이 대기(인증 2.1초/비인증 6.5초), `x-ratelimit-remaining` ≤ 1이면 중단.
- 로그: 소스 slug, 건수, 소요 시간, 에러 코드만. 토큰·본문은 기록하지 않는다.
