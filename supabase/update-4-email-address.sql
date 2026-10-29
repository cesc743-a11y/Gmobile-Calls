-- ===========================================================================
-- Update 4: customer email and delivery address on each call. Safe to re-run.
-- ===========================================================================
alter table public.calls add column if not exists email text;
alter table public.calls add column if not exists address text;

-- The call log now also tracks email and address changes.
create or replace function public.calls_audit() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  diff jsonb := '{}'::jsonb;
  k text;
  tracked text[] := array['phone','name','category','device','product_id','price_range','quoted_price','sale_amount','source','campaign_id','ad_id','email','address','branch','status','cancel_reason','cancel_note','follow_up_date','notes','owner_id'];
  o jsonb; n jsonb; act text;
begin
  if tg_op = 'INSERT' then
    insert into call_events (call_id, by, action, changes, call_name, call_phone, call_date)
    values (new.id, auth.uid(), 'create', jsonb_build_object('status', jsonb_build_array(null, new.status)), new.name, new.phone, new.call_date);
    return new;
  elsif tg_op = 'DELETE' then
    insert into call_events (call_id, by, action, changes, call_name, call_phone, call_date)
    values (old.id, auth.uid(), 'delete', to_jsonb(old), old.name, old.phone, old.call_date);
    return old;
  end if;
  o := to_jsonb(old); n := to_jsonb(new);
  foreach k in array tracked loop
    if o->k is distinct from n->k then diff := diff || jsonb_build_object(k, jsonb_build_array(o->k, n->k)); end if;
  end loop;
  if diff = '{}'::jsonb then return new; end if;
  act := case when (select bool_and(kk in ('status','cancel_reason','cancel_note','sale_amount')) from jsonb_object_keys(diff) as kk) and diff ? 'status' then 'status' else 'edit' end;
  insert into call_events (call_id, by, action, changes, call_name, call_phone, call_date)
  values (new.id, auth.uid(), act, diff, new.name, new.phone, new.call_date);
  return new;
end $$;
