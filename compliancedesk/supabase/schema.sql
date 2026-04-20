-- ComplianceDesk Supabase schema
-- Run this in the Supabase SQL editor (or psql) once per project.

create extension if not exists "pgcrypto";

-- ────────────── profiles ──────────────
create table if not exists public.profiles (
  id                                uuid primary key references auth.users(id) on delete cascade,
  email                             text,
  network                           text check (network in ('sjp','quilter','openwork','sesame','independent')),
  adviser_name                      text,
  firm_name                         text,
  firm_fca_number                   text,
  default_ongoing_charge            text,
  default_initial_charge            text,
  stripe_customer_id                text unique,
  stripe_subscription_id            text,
  subscription_status               text default 'free',
  subscription_current_period_end   timestamptz,
  created_at                        timestamptz not null default now(),
  updated_at                        timestamptz not null default now()
);

create index if not exists profiles_stripe_customer_idx on public.profiles(stripe_customer_id);

-- ────────────── letters ──────────────
create table if not exists public.letters (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  client_name   text not null,
  product_type  text,
  network       text,
  form_data     jsonb,
  letter_text   text not null,
  created_at    timestamptz not null default now()
);

create index if not exists letters_user_created_idx on public.letters(user_id, created_at desc);

-- ────────────── RLS ──────────────
alter table public.profiles enable row level security;
alter table public.letters  enable row level security;

drop policy if exists "profiles self read"  on public.profiles;
drop policy if exists "profiles self write" on public.profiles;
drop policy if exists "letters self read"   on public.letters;
drop policy if exists "letters self write"  on public.letters;
drop policy if exists "letters self delete" on public.letters;

create policy "profiles self read"  on public.profiles for select using (auth.uid() = id);
create policy "profiles self write" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles self update" on public.profiles for update using (auth.uid() = id);

create policy "letters self read"   on public.letters  for select using (auth.uid() = user_id);
create policy "letters self write"  on public.letters  for insert with check (auth.uid() = user_id);
create policy "letters self delete" on public.letters  for delete using (auth.uid() = user_id);

-- ────────────── auto-create profile on signup ──────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, network, adviser_name, firm_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'network', 'independent'),
    new.raw_user_meta_data->>'adviser_name',
    new.raw_user_meta_data->>'firm_name'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
