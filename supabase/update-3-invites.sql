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
