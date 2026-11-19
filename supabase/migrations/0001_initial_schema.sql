-- IssueHub 초기 스키마 (PostgreSQL / Supabase)
-- 공개 조회 테이블은 읽기 전용 RLS, 쓰기는 secret key(서비스 역할)를 쓰는 수집기만 수행한다.

create extension if not exists pgcrypto;

-- 출처 -------------------------------------------------------------------
create table public.sources (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{1,40}$'),
  name text not null,
  kind text not null check (kind in ('github', 'hackernews', 'rss')),
  source_tier text not null check (source_tier in ('official', 'community', 'independent')),
  homepage_url text,
  feed_url text,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

-- 기사 -------------------------------------------------------------------
create table public.articles (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.sources(id) on delete restrict,
  source_item_id text,
  normalized_url text not null unique,
  original_url text not null,
  title text not null check (char_length(title) <= 500),
  title_ko text,
  excerpt text,
  summary_ko text,
  key_points jsonb not null default '[]'::jsonb,
  why_it_matters text,
  use_cases jsonb not null default '[]'::jsonb,
  caveats text,
  summary_status text not null default 'pending'
    check (summary_status in ('pending', 'completed', 'failed', 'skipped')),
  summary_error text,
  summary_attempts integer not null default 0,
  relevance_score numeric,
  popularity integer,
  published_at timestamptz,
  fetched_at timestamptz not null default now(),
  summarized_at timestamptz
);
create unique index articles_source_item_uidx on public.articles (source_id, source_item_id) where source_item_id is not null;
create index articles_published_idx on public.articles (published_at desc);
create index articles_source_published_idx on public.articles (source_id, published_at desc);
create index articles_pending_idx on public.articles (fetched_at) where summary_status = 'pending';

-- 토픽 -------------------------------------------------------------------
create table public.topics (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_ko text not null,
  description text
);

create table public.article_topics (
  article_id uuid not null references public.articles(id) on delete cascade,
  topic_id uuid not null references public.topics(id) on delete cascade,
  primary key (article_id, topic_id)
);
create index article_topics_topic_idx on public.article_topics (topic_id, article_id);

-- 저장소 -----------------------------------------------------------------
create table public.repositories (
  id uuid primary key default gen_random_uuid(),
  github_id bigint not null unique,
  full_name text not null unique,
  html_url text not null,
  description text,
  summary_ko text,
  language text,
  github_topics text[] not null default '{}',
  topic_slugs text[] not null default '{}',
  stars_total integer not null default 0,
  forks_total integer not null default 0,
  pushed_at timestamptz,
  repo_created_at timestamptz,
  last_synced_at timestamptz not null default now()
);
create index repositories_stars_idx on public.repositories (stars_total desc);
create index repositories_topic_slugs_idx on public.repositories using gin (topic_slugs);

create table public.repo_snapshots (
  id uuid primary key default gen_random_uuid(),
  repository_id uuid not null references public.repositories(id) on delete cascade,
  stars_count integer not null,
  captured_date date not null,
  unique (repository_id, captured_date)
);
create index repo_snapshots_repo_date_idx on public.repo_snapshots (repository_id, captured_date desc);

-- 수집 실행 기록 ----------------------------------------------------------
create table public.sync_runs (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references public.sources(id) on delete set null,
  status text not null check (status in ('running', 'success', 'partial', 'failed')),
  fetched_count integer not null default 0,
  saved_count integer not null default 0,
  error_code text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);
create index sync_runs_finished_idx on public.sync_runs (finished_at desc);

-- 2차: 계정 기반 북마크 (MVP는 localStorage 사용, 테이블만 정의) ---------------
create table public.bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  article_id uuid references public.articles(id) on delete cascade,
  repository_id uuid references public.repositories(id) on delete cascade,
  created_at timestamptz not null default now(),
  check ((article_id is not null) <> (repository_id is not null))
);
create unique index bookmarks_user_article_uidx on public.bookmarks (user_id, article_id) where article_id is not null;
create unique index bookmarks_user_repo_uidx on public.bookmarks (user_id, repository_id) where repository_id is not null;

-- 조회용 view (security_invoker: 호출자 권한으로 RLS 적용) -------------------
create view public.article_feed with (security_invoker = true) as
select
  a.id, a.source_item_id, a.original_url, a.title, a.title_ko, a.excerpt, a.summary_ko,
  a.key_points, a.why_it_matters, a.use_cases, a.caveats, a.summary_status,
  a.relevance_score, a.popularity, a.published_at, a.fetched_at, a.summarized_at,
  coalesce(a.published_at, a.fetched_at) as sort_at,
  s.slug as source_slug, s.name as source_name, s.kind as source_kind,
  s.source_tier, s.homepage_url as source_homepage_url,
  coalesce(array_agg(t.slug order by t.slug) filter (where t.slug is not null), '{}') as topic_slugs
from public.articles a
join public.sources s on s.id = a.source_id
left join public.article_topics at on at.article_id = a.id
left join public.topics t on t.id = at.topic_id
group by a.id, s.id;

-- growth: 최신 스냅샷과 그 이전 7일 내 가장 오래된 스냅샷의 차이. 없으면 null(집계 중)
-- src/lib/data/growth.ts 의 computeGrowth 와 같은 규칙.
create view public.repository_feed with (security_invoker = true) as
select r.*, g.stars_growth, g.growth_from, g.growth_to
from public.repositories r
left join lateral (
  select latest.stars_count - base.stars_count as stars_growth,
         base.captured_date as growth_from,
         latest.captured_date as growth_to
  from (
    select stars_count, captured_date from public.repo_snapshots
    where repository_id = r.id order by captured_date desc limit 1
  ) latest
  join lateral (
    select stars_count, captured_date from public.repo_snapshots
    where repository_id = r.id
      and captured_date < latest.captured_date
      and captured_date >= latest.captured_date - 7
    order by captured_date asc limit 1
  ) base on true
) g on true;

-- RLS --------------------------------------------------------------------
alter table public.sources enable row level security;
alter table public.articles enable row level security;
alter table public.topics enable row level security;
alter table public.article_topics enable row level security;
alter table public.repositories enable row level security;
alter table public.repo_snapshots enable row level security;
alter table public.sync_runs enable row level security;
alter table public.bookmarks enable row level security;

create policy "public read" on public.sources for select to anon, authenticated using (enabled);
create policy "public read" on public.articles for select to anon, authenticated using (true);
create policy "public read" on public.topics for select to anon, authenticated using (true);
create policy "public read" on public.article_topics for select to anon, authenticated using (true);
create policy "public read" on public.repositories for select to anon, authenticated using (true);
create policy "public read" on public.repo_snapshots for select to anon, authenticated using (true);
create policy "public read" on public.sync_runs for select to anon, authenticated using (true);
-- bookmarks: 2차(Supabase Auth)에서 사용. 소유자만 조회·추가·삭제.
create policy "owner read" on public.bookmarks for select to authenticated using ((select auth.uid()) = user_id);
create policy "owner insert" on public.bookmarks for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "owner delete" on public.bookmarks for delete to authenticated using ((select auth.uid()) = user_id);
-- 쓰기 정책 없음: secret key(service_role)는 RLS를 우회하므로 수집기만 쓸 수 있다.

-- Seed -------------------------------------------------------------------
insert into public.topics (slug, name_ko, description) values
  ('ai-llm', 'AI·LLM', '대규모 언어 모델, 모델 출시, 추론·평가와 AI 활용 사례'),
  ('claude-skills', 'Claude Skills', 'Claude Code, Agent Skills, 프롬프트·워크플로 자동화'),
  ('mcp-agents', 'MCP·Agents', 'Model Context Protocol, 에이전트 프레임워크와 도구 연동'),
  ('github-oss', 'GitHub·Open Source', '오픈소스 프로젝트, GitHub 기능 변화, 커뮤니티와 라이선스'),
  ('frontend', 'Frontend', '웹 프론트엔드 프레임워크, 브라우저 플랫폼, CSS와 UI 엔지니어링'),
  ('backend', 'Backend', '서버, 데이터베이스, 인프라와 API 설계'),
  ('game-dev', 'Game Dev', '게임 엔진, 그래픽스, 게임 개발 도구와 사례')
on conflict (slug) do nothing;

-- RSS는 실제 피드 응답을 확인한 것만 등록한다(docs/data-sources.md).
insert into public.sources (slug, name, kind, source_tier, homepage_url, feed_url) values
  ('github', 'GitHub Search API', 'github', 'official', 'https://github.com', null),
  ('hackernews', 'Hacker News', 'hackernews', 'community', 'https://news.ycombinator.com', null),
  ('github-blog', 'The GitHub Blog', 'rss', 'official', 'https://github.blog', 'https://github.blog/feed/'),
  ('nextjs-blog', 'Next.js Blog', 'rss', 'official', 'https://nextjs.org/blog', 'https://nextjs.org/feed.xml'),
  ('cloudflare-blog', 'The Cloudflare Blog', 'rss', 'official', 'https://blog.cloudflare.com', 'https://blog.cloudflare.com/rss/')
on conflict (slug) do nothing;
