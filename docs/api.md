# 공개 API

모두 `GET`, 인증 없음, 읽기 전용. 쓰기/수집 엔드포인트는 없다.

- 성공: `{ "data": ..., "meta": { "nextCursor": string|null, "asOf": ISO8601|null } }`
- 실패: `{ "error": { "code": string, "message": string } }` — `400 INVALID_PARAMS|INVALID_ID`, `404 NOT_FOUND`, `500 INTERNAL_ERROR`
- `limit` 기본 20, 최대 50. `cursor`는 이전 응답의 `meta.nextCursor` 값(불투명 문자열로 취급).
- `asOf` = 마지막 성공 수집 시각.

| URL | 파라미터 |
|---|---|
| `/api/health` | — `{ status, mode: "demo"|"live", lastSuccessfulSyncAt }` |
| `/api/articles` | `q`(≤100자), `topic`(등록된 slug), `source`, `tier=official|community|independent`, `period=24h|7d|30d|all`, `sort=latest|relevant|popular|discussed`(댓글 많은 순), `cursor`, `limit` |
| `/api/articles/:id` | UUID. 기사 + `related` |
| `/api/games` | `list=most_played|top_sellers|new_releases|coming_soon` (기본 most_played) |
| `/api/repos` | `q`, `language`, `topic`, `sort=stars|updated|growth`, `cursor`, `limit` |
| `/api/repos/:id` | UUID. 저장소 + 최근 30개 `snapshots` |
| `/api/topics` | 토픽 + `articleCount`, `repoCount` |
| `/api/sources` | 활성 출처 |
| `/api/stats` | KPI(`articlesLast24h`, `reposTotal`, `summariesCompleted`), `basis`(집계 기준) |

정렬 의미
- `relevant`: 등록된 토픽 키워드 일치 수(0~10, 없으면 null → 뒤로).
- `popular`: 출처 인기 지표(HN points). 지표 없는 출처는 뒤로.
- `growth`: 관측 Star 증가량. 스냅샷 부족(null)은 0이 아니라 뒤로.

예시
```bash
curl "http://localhost:3000/api/articles?topic=ai-llm&period=7d&sort=popular&limit=5"
```
