-- ===========================================================================
-- Update 2: Meta campaigns & ads, ad on each call, team edits the price list
-- with a full price log. Safe to run more than once.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Meta campaigns and ads
-- ---------------------------------------------------------------------------
alter table public.campaigns add column if not exists meta_id text;
alter table public.campaigns add column if not exists account_id text;
alter table public.campaigns add column if not exists objective text;
alter table public.campaigns add column if not exists status text;
alter table public.campaigns add column if not exists synced_at timestamptz;
create unique index if not exists campaigns_meta_id_key on public.campaigns (meta_id);

create table if not exists public.ads (
  id uuid primary key default gen_random_uuid(),
  meta_id text not null unique,
  name text not null,
  campaign_id uuid references public.campaigns(id) on delete set null,
  status text,
  created_at timestamptz not null default now(),
  synced_at timestamptz
);
create index if not exists ads_campaign_idx on public.ads (campaign_id);

alter table public.ads enable row level security;
drop policy if exists "ads read" on public.ads;
create policy "ads read" on public.ads for select to authenticated using (public.is_active());
drop policy if exists "ads admin" on public.ads;
create policy "ads admin" on public.ads for all to authenticated using (public.is_admin()) with check (public.is_admin());

alter table public.calls add column if not exists ad_id uuid references public.ads(id) on delete set null;
create index if not exists calls_ad_idx on public.calls (ad_id);

-- The call log now also tracks the ad.
create or replace function public.calls_audit() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  diff jsonb := '{}'::jsonb;
  k text;
  tracked text[] := array['phone','name','category','device','product_id','price_range','quoted_price','sale_amount','source','campaign_id','ad_id','branch','status','cancel_reason','cancel_note','follow_up_date','notes','owner_id'];
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

-- ---------------------------------------------------------------------------
-- Price list: every active team member can add and edit; every change is logged
-- with the person's name and email at the time of the change.
-- ---------------------------------------------------------------------------
alter table public.products add column if not exists created_by uuid references public.profiles(id) default auth.uid();
alter table public.products add column if not exists updated_by uuid references public.profiles(id);

drop policy if exists "products admin" on public.products;
drop policy if exists "products insert" on public.products;
create policy "products insert" on public.products for insert to authenticated with check (public.is_active());
drop policy if exists "products update" on public.products;
create policy "products update" on public.products for update to authenticated using (public.is_active()) with check (public.is_active());
drop policy if exists "products delete" on public.products;
create policy "products delete" on public.products for delete to authenticated using (public.is_admin());

create or replace function public.products_before() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then new.created_by := auth.uid(); else new.created_by := old.created_by; end if;
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end $$;
drop trigger if exists products_before on public.products;
create trigger products_before before insert or update on public.products
  for each row execute function public.products_before();

create table if not exists public.product_events (
  id bigserial primary key,
  product_id uuid not null,
  at timestamptz not null default now(),
  by uuid,
  by_name text,
  by_email text,
  action text not null,          -- create | edit | delete
  product_name text,
  category text,
  changes jsonb
);
create index if not exists product_events_at_idx on public.product_events (at desc);

create or replace function public.products_audit() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  diff jsonb := '{}'::jsonb;
  k text;
  tracked text[] := array['name','category','price','in_stock','active'];
  o jsonb; n jsonb;
  who_name text; who_email text;
begin
  select full_name, email into who_name, who_email from profiles where id = auth.uid();
  if tg_op = 'INSERT' then
    insert into product_events (product_id, by, by_name, by_email, action, product_name, category, changes)
    values (new.id, auth.uid(), who_name, who_email, 'create', new.name, new.category,
            jsonb_build_object('price', jsonb_build_array(null, new.price), 'in_stock', jsonb_build_array(null, new.in_stock)));
    return new;
  elsif tg_op = 'DELETE' then
    insert into product_events (product_id, by, by_name, by_email, action, product_name, category, changes)
    values (old.id, auth.uid(), who_name, who_email, 'delete', old.name, old.category, to_jsonb(old));
    return old;
  end if;
  o := to_jsonb(old); n := to_jsonb(new);
  foreach k in array tracked loop
    if o->k is distinct from n->k then diff := diff || jsonb_build_object(k, jsonb_build_array(o->k, n->k)); end if;
  end loop;
  if diff = '{}'::jsonb then return new; end if;
  insert into product_events (product_id, by, by_name, by_email, action, product_name, category, changes)
  values (new.id, auth.uid(), who_name, who_email, case when diff ? 'active' and not new.active then 'delete' else 'edit' end, new.name, new.category, diff);
  return new;
end $$;
drop trigger if exists products_audit on public.products;
create trigger products_audit after insert or update or delete on public.products
  for each row execute function public.products_audit();

alter table public.product_events enable row level security;
drop policy if exists "product events read" on public.product_events;
create policy "product events read" on public.product_events for select to authenticated using (public.is_active());
-- no insert/update/delete policies: only the audit trigger writes the price log

do $$ begin
  begin alter publication supabase_realtime add table public.product_events; exception when duplicate_object then null; end;
end $$;
