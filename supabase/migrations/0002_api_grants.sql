-- Data API(PostgREST) 접근 권한.
-- 최근 Supabase 프로젝트는 SQL로 만든 테이블에 anon/authenticated/service_role 권한을 자동으로 주지 않아
-- 0001만 적용하면 모든 요청이 42501(permission denied)로 실패한다. 행 단위 접근 제어는 0001의 RLS가 담당한다.

grant usage on schema public to anon, authenticated, service_role;

-- 공개 읽기 (RLS 정책: public read)
grant select on
  public.sources, public.articles, public.topics, public.article_topics,
  public.repositories, public.repo_snapshots, public.sync_runs,
  public.article_feed, public.repository_feed
to anon, authenticated;

-- 수집기(secret key = service_role) 쓰기. service_role은 RLS를 우회한다.
grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

-- 2차 계정 북마크 (RLS 정책: 소유자만)
grant select, insert, delete on public.bookmarks to authenticated;
