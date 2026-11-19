# 아키텍처

```
브라우저 ──▶ Next.js (Vercel)
              ├─ Server Components 페이지 ─┐
              └─ /api/* (GET 전용, zod 검증) ┤
                                            ▼
                               src/lib/data/getData()
                                ├─ demoAdapter (DEMO_MODE=true 또는 Supabase 미설정)
                                └─ supabaseAdapter (publishable key + RLS 읽기 전용)
                                            ▲ 읽기
GitHub Actions (6h) ─▶ scripts/ingest.ts ───┤ 쓰기(secret key)
                   └─▶ scripts/summarize.ts ┘ ──▶ Anthropic API
```

## 레이어
| 경로 | 역할 |
|---|---|
| `src/app/(site)` | 페이지. searchParams → `parseLenient`(잘못된 값은 기본값) → data layer |
| `src/app/api` | 공개 REST. `parseQuery`(잘못된 값은 400), `handle`(500 시 스택 숨김) |
| `src/lib/data` | `DataAdapter` 인터페이스, 데모/Supabase 구현, 공통 필터·정렬(`query.ts`), growth(`growth.ts`) |
| `src/lib/ingestion` | URL 정규화, 날짜 UTC 변환, 토픽 태깅, 연관도, 중복 제거 |
| `src/lib/ai` | 요약 출력 스키마·검증(`schema.ts`), Anthropic 호출·재시도(`summarize.ts`) |
| `src/lib/bookmarks` | localStorage 북마크 스토어(`useSyncExternalStore`) |
| `scripts/sources` | GitHub/HN/RSS 어댑터(파싱 함수는 순수 함수로 테스트) |
| `supabase/migrations` | 테이블, 인덱스, RLS, 조회용 view(`article_feed`, `repository_feed`), seed |

## 데이터 모델
ERD는 설계서 §5와 같다. 추가한 컬럼:
- `articles.popularity` — 출처 인기 지표(HN points). 출처 신뢰도와 분리.
- `articles.summary_error`, `summary_attempts` — 실패 원인 코드와 시도 횟수.
- `repositories.github_topics`, `topic_slugs`, `repo_created_at`.
- `sync_runs.status`: `running|success|partial|failed`.

## 렌더링
- 기본 Server Components, `force-dynamic`(데이터가 수집 주기마다 바뀜). API 응답은 `s-maxage=60`.
- 시각: DB/API는 UTC ISO. 서버는 KST로 렌더, 브라우저에서 로컬 시간대로 재렌더(`LocalTime`).
- 테마: `<head>` 인라인 스크립트가 페인트 전에 `data-theme` 적용 → 깜빡임 없음.
