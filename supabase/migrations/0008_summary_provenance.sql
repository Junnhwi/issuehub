-- 요약을 만든 모델과 프롬프트 버전 기록(선택). 프롬프트·모델을 바꾼 뒤 특정 버전의 요약만 다시 만들 때 쓴다.
-- 적용 전에도 요약기는 동작한다(열이 없으면 기록만 건너뜀). 기존 데이터는 바뀌지 않는다.
alter table public.articles add column if not exists summary_model text;
alter table public.articles add column if not exists summary_prompt_version text;

-- 예: 이전 프롬프트로 만든 요약을 다시 만들고 싶을 때(실행 전 대상 수를 먼저 확인)
--   select count(*) from public.articles where summary_status in ('completed','skipped') and summary_prompt_version is distinct from 'article-v2';
--   update public.articles set summary_status = 'pending', summary_attempts = 0
--    where summary_status in ('completed','skipped') and summary_prompt_version is distinct from 'article-v2';
