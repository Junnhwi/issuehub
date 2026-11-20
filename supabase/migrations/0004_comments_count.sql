-- 커뮤니티 반응(예: Hacker News 댓글 수). 출처가 제공하지 않으면 null
alter table public.articles add column if not exists comments_count integer;

-- 조회 view 맨 뒤에 comments_count 추가(create or replace view는 열을 끝에만 추가할 수 있다)
create or replace view public.article_feed with (security_invoker = true) as
select
  a.id, a.source_item_id, a.original_url, a.title, a.title_ko, a.excerpt, a.summary_ko,
  a.key_points, a.why_it_matters, a.use_cases, a.caveats, a.summary_status,
  a.relevance_score, a.popularity, a.published_at, a.fetched_at, a.summarized_at,
  coalesce(a.published_at, a.fetched_at) as sort_at,
  s.slug as source_slug, s.name as source_name, s.kind as source_kind,
  s.source_tier, s.homepage_url as source_homepage_url,
  coalesce(array_agg(t.slug order by t.slug) filter (where t.slug is not null), '{}') as topic_slugs,
  a.excerpt_ko,
  a.comments_count
from public.articles a
join public.sources s on s.id = a.source_id
left join public.article_topics at on at.article_id = a.id
left join public.topics t on t.id = at.topic_id
group by a.id, s.id;

grant select on public.article_feed to anon, authenticated;
