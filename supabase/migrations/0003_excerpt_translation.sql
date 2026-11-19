-- 원문 발췌의 한국어 번역. 요약과 별개로, 요약 근거가 부족한 글도 번역은 저장한다.
alter table public.articles add column if not exists excerpt_ko text;

-- 조회 view에 excerpt_ko를 맨 뒤에 추가(create or replace view는 열을 끝에만 추가할 수 있다)
create or replace view public.article_feed with (security_invoker = true) as
select
  a.id, a.source_item_id, a.original_url, a.title, a.title_ko, a.excerpt, a.summary_ko,
  a.key_points, a.why_it_matters, a.use_cases, a.caveats, a.summary_status,
  a.relevance_score, a.popularity, a.published_at, a.fetched_at, a.summarized_at,
  coalesce(a.published_at, a.fetched_at) as sort_at,
  s.slug as source_slug, s.name as source_name, s.kind as source_kind,
  s.source_tier, s.homepage_url as source_homepage_url,
  coalesce(array_agg(t.slug order by t.slug) filter (where t.slug is not null), '{}') as topic_slugs,
  a.excerpt_ko
from public.articles a
join public.sources s on s.id = a.source_id
left join public.article_topics at on at.article_id = a.id
left join public.topics t on t.id = at.topic_id
group by a.id, s.id;

grant select on public.article_feed to anon, authenticated;
