-- 매시 20분(UTC·KST 모두 :20)에 Supabase가 GitHub Actions의 Ingest 워크플로를 실행시킨다.
-- GitHub 자체 예약(schedule)이 자주 건너뛰어져서, 시계를 DB(pg_cron)에 둔다.
--
-- 먼저 할 일(이 파일에는 토큰을 넣지 않는다):
--   SQL Editor에서 한 번만 실행
--   select vault.create_secret('github_pat_여기에_토큰', 'github_dispatch_token');
-- 토큰: GitHub Fine-grained token, 저장소 issuehub만, 권한 Actions: Read and write

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 같은 이름으로 다시 실행하면 기존 작업을 덮어쓴다(재실행 안전)
select cron.schedule(
  'issuehub-ingest-hourly',
  '20 * * * *',
  $$
  select net.http_post(
    url := 'https://api.github.com/repos/Junnhwi/issuehub/actions/workflows/ingest.yml/dispatches',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'github_dispatch_token'),
      'Accept', 'application/vnd.github+json',
      'X-GitHub-Api-Version', '2022-11-28',
      'User-Agent', 'issuehub-pg-cron',
      'Content-Type', 'application/json'
    ),
    body := '{"ref":"main"}'::jsonb
  );
  $$
);

-- 확인용(실행 후 1~2분 뒤): status_code 204면 GitHub이 실행 요청을 받은 것
--   select created, status_code, content from net._http_response order by created desc limit 5;
-- 중지하려면
--   select cron.unschedule('issuehub-ingest-hourly');
