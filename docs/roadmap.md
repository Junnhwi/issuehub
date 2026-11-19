# 로드맵

## 완료 (MVP 1차, 2026-11-19)
- [x] 디자인 시스템, 반응형 레이아웃, 다크/라이트
- [x] 7개 화면 + 토픽 목록, 검색·필터·정렬·페이지네이션, 로딩/오류/404
- [x] localStorage 북마크
- [x] Supabase 스키마·RLS·view, 데모/실데이터 어댑터
- [x] GitHub/HN/RSS 수집기(dry-run 실검증), upsert·스냅샷
- [x] AI 요약기(키 없으면 no-op), GitHub Actions, CI
- [x] 단위 테스트, lint, typecheck, build

## 사용자 설정 후 검증 필요
- [ ] Supabase 프로젝트에 마이그레이션 적용 후 `npm run ingest` 실저장 확인
- [ ] Anthropic 키로 `npm run summarize` 실제 요약 품질 확인
- [ ] GitHub 원격 저장소 + Actions Secrets 등록 후 Ingest 워크플로 실행
- [ ] Vercel 배포

## 2차
- Supabase Auth + 계정 북마크(`/api/bookmarks`, RLS 테스트)
- Notion OAuth 학습 노트 내보내기
- `/settings`: 관심 토픽·키워드, 개인화
- 기술별 성장 추세 대시보드, 기간별 저장소 증감 차트
- Playwright E2E, 운영 모니터링·관리자 기능
- keyset 페이지네이션, Postgres 전문 검색(`tsvector`)
