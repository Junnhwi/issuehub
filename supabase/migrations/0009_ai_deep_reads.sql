-- AI 원문 해설(기사)과 README 활용 가이드(저장소).
-- 수집 배치(scripts/deep-read.ts)가 원문·README를 읽고 만든 결과만 저장한다. 원문 전문은 저장하지 않는다.
-- 적용 전에도 사이트·수집은 동작한다(해설 단계만 건너뜀). 기존 데이터는 바뀌지 않는다.

create table if not exists public.article_deep_reads (
  article_id uuid primary key references public.articles(id) on delete cascade,
  -- completed: 해설 있음 / skipped: 만들 수 없음(robots 거부·HTML 아님·본문 부족, 다시 시도 안 함) / failed: 검증 실패(재시도 대상)
  status text not null check (status in ('completed', 'skipped', 'failed')),
  content jsonb,
  image_url text,
  source_chars integer,
  error text,
  attempts integer not null default 1,
  model text,
  prompt_version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.repo_guides (
  repo_id uuid primary key references public.repositories(id) on delete cascade,
  status text not null check (status in ('completed', 'skipped', 'failed')),
  content jsonb,
  source_chars integer,
  error text,
  attempts integer not null default 1,
  model text,
  prompt_version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.article_deep_reads enable row level security;
alter table public.repo_guides enable row level security;

drop policy if exists "public read" on public.article_deep_reads;
create policy "public read" on public.article_deep_reads for select to anon, authenticated using (true);
drop policy if exists "public read" on public.repo_guides;
create policy "public read" on public.repo_guides for select to anon, authenticated using (true);

grant select on public.article_deep_reads, public.repo_guides to anon, authenticated;
grant select, insert, update, delete on public.article_deep_reads, public.repo_guides to service_role;
