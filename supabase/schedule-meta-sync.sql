-- Optional: run the Meta sync every hour by itself.
-- Before running, replace YOUR_CRON_SECRET with the same value you saved as the CRON_SECRET
-- secret of the meta-sync Edge Function, and YOUR_ANON_KEY with the project's anon key.
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('meta-sync') where exists (select 1 from cron.job where jobname = 'meta-sync');
select cron.schedule('meta-sync', '0 * * * *', $$
  select net.http_post(
    url := 'https://vfoxkglptskgbzlqceow.supabase.co/functions/v1/meta-sync',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer YOUR_ANON_KEY', 'x-cron-secret', 'YOUR_CRON_SECRET'),
    body := '{}'::jsonb
  );
$$);
