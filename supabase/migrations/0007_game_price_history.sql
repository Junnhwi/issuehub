-- Steam 유료 게임의 한국(KR) 가격 이력. 출처: IsThereAnyDeal API(/games/history/v2, country=KR, shop=Steam)
-- 값은 ITAD가 준 그대로 저장한다(약관: 제공 데이터 변경 금지).

alter table public.games add column if not exists itad_id uuid;
alter table public.games add column if not exists discount_ends_at timestamptz;     -- Steam이 알려 준 현재 세일 종료 시각
alter table public.games add column if not exists price_history_synced_at timestamptz;

create table if not exists public.game_price_history (
  appid integer not null references public.games(appid) on delete cascade,
  changed_at timestamptz not null,  -- 이 시각부터 아래 가격이 적용됨
  price numeric not null,
  regular numeric not null,
  cut integer not null,             -- 할인율(%)
  currency text not null,
  primary key (appid, changed_at)
);

alter table public.game_price_history enable row level security;
drop policy if exists "public read" on public.game_price_history;
create policy "public read" on public.game_price_history for select to anon, authenticated using (true);

grant select on public.game_price_history to anon, authenticated;
grant select, insert, update, delete on public.game_price_history to service_role;
