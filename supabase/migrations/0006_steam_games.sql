-- Steam 게임 동향: 동시접속 상위, 최고 인기, 신규 출시, 출시 예정
-- 공개 Steam API에서 수집(키 불필요). 평가·동시접속자는 Steam이 공개한 값 그대로 저장한다.

alter table public.sources drop constraint if exists sources_kind_check;
alter table public.sources add constraint sources_kind_check check (kind in ('github', 'hackernews', 'rss', 'steam'));

insert into public.sources (slug, name, kind, source_tier, homepage_url, feed_url) values
  ('steam', 'Steam 상점', 'steam', 'official', 'https://store.steampowered.com', null)
on conflict (slug) do nothing;

create table if not exists public.games (
  appid integer primary key,
  name text not null,
  store_url text not null,
  header_image text,
  description text,
  description_ko text,                 -- null=번역 대기, ''=번역할 설명 없음
  tags text[] not null default '{}',
  developers text[] not null default '{}',
  release_at timestamptz,
  release_label text,
  coming_soon boolean not null default false,
  is_free boolean not null default false,
  price text,
  discount_pct integer,
  review_label text,
  review_percent integer,
  review_count integer,
  current_players integer,
  peak_players integer,                -- 최근 일간 최고 동시접속(동시접속 상위 게임만)
  ranks jsonb not null default '{}'::jsonb, -- {"most_played":1,"top_sellers":3,...} 마지막 수집 기준
  first_seen_at timestamptz not null default now(),
  last_synced_at timestamptz not null default now()
);

create index if not exists games_ranks_idx on public.games using gin (ranks);

alter table public.games enable row level security;
drop policy if exists "public read" on public.games;
create policy "public read" on public.games for select to anon, authenticated using (true);

grant select on public.games to anon, authenticated;
grant select, insert, update, delete on public.games to service_role;
