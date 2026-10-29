-- G Mobile call log — database setup
-- Run this whole file once in Supabase: SQL Editor -> New query -> paste -> Run.
-- Safe to re-run: every object is created with "if not exists" or replaced.

-- ---------------------------------------------------------------------------
-- Team members (one row per login)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text not null default '',
  role text not null default 'agent' check (role in ('admin', 'agent')),
  job text not null default '',
  active boolean not null default false,
  created_at timestamptz not null default now()
);

-- New sign-ups start inactive. The very first account becomes an active admin.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare first_user boolean;
begin
  select not exists (select 1 from public.profiles) into first_user;
  insert into public.profiles (id, email, full_name, role, active)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''),
          case when first_user then 'admin' else 'agent' end, first_user);
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_active() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select active from public.profiles where id = auth.uid()), false)
$$;
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select active and role = 'admin' from public.profiles where id = auth.uid()), false)
$$;

-- ---------------------------------------------------------------------------
-- Price list, campaigns, settings (admins edit, everyone active reads)
-- ---------------------------------------------------------------------------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null check (category in ('android', 'iphone', 'accessories')),
  price numeric,
  in_stock boolean not null default true,
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.settings (
  key text primary key,
  value jsonb not null
);
insert into public.settings (key, value) values
  ('whatsapp_ar', to_jsonb('أهلًا {name} 👋 معاك G Mobile Store. بخصوص {device}، السعر {price} جنيه. تحب نحجزهولك؟'::text)),
  ('whatsapp_en', to_jsonb('Hi {name} 👋 this is G Mobile Store. About the {device}: the price is {price} EGP. Shall we reserve it for you?'::text))
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- Calls
-- ---------------------------------------------------------------------------
create table if not exists public.calls (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  call_date date not null default ((now() at time zone 'Africa/Cairo')::date),
  created_by uuid references public.profiles(id) default auth.uid(),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) default auth.uid(),
  owner_id uuid references public.profiles(id) default auth.uid(),   -- who is responsible for the deal
  phone text not null,
  name text not null,
  category text not null check (category in ('android', 'iphone', 'accessories')),
  device text not null,
  product_id uuid references public.products(id) on delete set null,
  price_range text,
  quoted_price numeric,
  sale_amount numeric,
  source text,
  campaign_id uuid references public.campaigns(id) on delete set null,
  branch text,
  status text not null default 'inquiry' check (status in ('inquiry', 'booked', 'delivered', 'not_delivered', 'cancelled')),
  cancel_reason text,
  cancel_note text,
  follow_up_date date,
  notes text,
  ever_booked boolean not null default false,
  delivered_at timestamptz
);
create index if not exists calls_date_idx on public.calls (call_date desc, created_at desc);
create index if not exists calls_phone_idx on public.calls (phone);
create index if not exists calls_follow_idx on public.calls (follow_up_date) where follow_up_date is not null;

-- Server-side stamps: the date is always Cairo time, editors are always the real user.
create or replace function public.calls_before() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.created_at := now();
    new.call_date := (now() at time zone 'Africa/Cairo')::date;
    new.created_by := auth.uid();
    if new.owner_id is null then new.owner_id := auth.uid(); end if;
  else
    new.created_at := old.created_at;
    new.call_date := old.call_date;
    new.created_by := old.created_by;
  end if;
  new.updated_at := now();
  new.updated_by := auth.uid();
  if new.status in ('booked', 'delivered', 'not_delivered') then new.ever_booked := true; end if;
  if tg_op = 'UPDATE' and old.ever_booked then new.ever_booked := true; end if;
  if new.status = 'delivered' and (tg_op = 'INSERT' or old.status is distinct from 'delivered') then new.delivered_at := now(); end if;
  if new.status <> 'delivered' then new.delivered_at := null; end if;
  return new;
end $$;
drop trigger if exists calls_before on public.calls;
create trigger calls_before before insert or update on public.calls
  for each row execute function public.calls_before();

-- ---------------------------------------------------------------------------
-- Activity log: written only by the database, nobody can edit or delete it
-- ---------------------------------------------------------------------------
create table if not exists public.call_events (
  id bigserial primary key,
  call_id uuid not null,
  at timestamptz not null default now(),
  by uuid,
  action text not null,           -- create | edit | status | delete
  changes jsonb,
  call_name text,
  call_phone text,
  call_date date
);
create index if not exists call_events_at_idx on public.call_events (at desc);
create index if not exists call_events_call_idx on public.call_events (call_id);

create or replace function public.calls_audit() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  diff jsonb := '{}'::jsonb;
  k text;
  tracked text[] := array['phone','name','category','device','product_id','price_range','quoted_price','sale_amount','source','campaign_id','branch','status','cancel_reason','cancel_note','follow_up_date','notes','owner_id'];
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
drop trigger if exists calls_audit on public.calls;
create trigger calls_audit after insert or update or delete on public.calls
  for each row execute function public.calls_audit();

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.campaigns enable row level security;
alter table public.settings enable row level security;
alter table public.calls enable row level security;
alter table public.call_events enable row level security;

drop policy if exists "profiles read" on public.profiles;
create policy "profiles read" on public.profiles for select to authenticated using (id = auth.uid() or public.is_active());
drop policy if exists "profiles admin update" on public.profiles;
create policy "profiles admin update" on public.profiles for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "profiles self name" on public.profiles;
-- people may fix their own display name only (role/active stay admin-only via the guard trigger below)
create policy "profiles self name" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create or replace function public.profiles_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    new.role := old.role; new.active := old.active; new.job := old.job; new.email := old.email;
  end if;
  -- never leave the system without an active admin
  if old.role = 'admin' and old.active and (new.role <> 'admin' or not new.active)
     and (select count(*) from profiles where role = 'admin' and active and id <> old.id) = 0 then
    raise exception 'At least one active admin is required';
  end if;
  return new;
end $$;
drop trigger if exists profiles_guard on public.profiles;
create trigger profiles_guard before update on public.profiles
  for each row execute function public.profiles_guard();

drop policy if exists "products read" on public.products;
create policy "products read" on public.products for select to authenticated using (public.is_active());
drop policy if exists "products admin" on public.products;
create policy "products admin" on public.products for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "campaigns read" on public.campaigns;
create policy "campaigns read" on public.campaigns for select to authenticated using (public.is_active());
drop policy if exists "campaigns admin" on public.campaigns;
create policy "campaigns admin" on public.campaigns for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "settings read" on public.settings;
create policy "settings read" on public.settings for select to authenticated using (public.is_active());
drop policy if exists "settings admin" on public.settings;
create policy "settings admin" on public.settings for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "calls read" on public.calls;
create policy "calls read" on public.calls for select to authenticated using (public.is_active());
drop policy if exists "calls insert" on public.calls;
create policy "calls insert" on public.calls for insert to authenticated with check (public.is_active());
drop policy if exists "calls update" on public.calls;
create policy "calls update" on public.calls for update to authenticated using (public.is_active()) with check (public.is_active());
drop policy if exists "calls delete" on public.calls;
create policy "calls delete" on public.calls for delete to authenticated using (public.is_admin());

drop policy if exists "events read" on public.call_events;
create policy "events read" on public.call_events for select to authenticated using (public.is_active());
-- no insert/update/delete policies: only the audit trigger writes events

-- Live updates in the app
do $$ begin
  begin alter publication supabase_realtime add table public.calls; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.call_events; exception when duplicate_object then null; end;
end $$;

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

-- ===========================================================================
-- Update 3: invite team members by email. An invited email is active from its
-- first sign-in, with the name, job and access the admin chose. Safe to re-run.
-- ===========================================================================
create table if not exists public.invites (
  email text primary key check (email = lower(email)),
  full_name text not null default '',
  job text not null default '',
  role text not null default 'agent' check (role in ('admin', 'agent')),
  invited_by uuid references public.profiles(id) default auth.uid(),
  created_at timestamptz not null default now(),
  used_at timestamptz
);
alter table public.invites enable row level security;
drop policy if exists "invites admin" on public.invites;
create policy "invites admin" on public.invites for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- New sign-ups: first account is the admin, invited emails start active, anyone else waits.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare first_user boolean; inv public.invites;
begin
  select not exists (select 1 from public.profiles) into first_user;
  select * into inv from public.invites where email = lower(new.email);
  insert into public.profiles (id, email, full_name, role, job, active)
  values (new.id, new.email,
          coalesce(nullif(inv.full_name, ''), new.raw_user_meta_data->>'full_name', ''),
          case when first_user then 'admin' else coalesce(inv.role, 'agent') end,
          coalesce(inv.job, ''),
          first_user or inv.email is not null);
  if inv.email is not null then update public.invites set used_at = now() where email = inv.email; end if;
  return new;
end $$;

-- Inviting someone who already signed up activates them right away.
create or replace function public.invites_apply() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set active = true, role = new.role,
         job = coalesce(nullif(new.job, ''), job), full_name = coalesce(nullif(new.full_name, ''), full_name)
   where lower(email) = new.email;
  if found then new.used_at := now(); end if;
  return new;
end $$;
drop trigger if exists invites_apply on public.invites;
create trigger invites_apply before insert on public.invites
  for each row execute function public.invites_apply();
