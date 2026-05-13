-- Recap — meeting transcription, speaker labels, template-driven summaries.
-- This is the canonical schema. Apply via `psql` against your Supabase project,
-- or via `supabase db push` / the MCP `apply_migration` tool.

create extension if not exists "pgcrypto";

-- --------------------------------------------------------------------------
-- profiles: app-level user data keyed to auth.users
-- --------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  speaker_aliases jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- --------------------------------------------------------------------------
-- templates: built-in + user-owned summary templates
--   `owner_id is null` means a built-in/system template (visible to everyone).
-- --------------------------------------------------------------------------
create table if not exists public.templates (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete cascade,
  slug text not null,
  name text not null,
  description text,
  sections jsonb not null,        -- e.g. [{"key":"decisions","label":"Decisions"}, ...]
  prompt text not null,           -- instructions appended to the system prompt
  is_premium boolean not null default false,
  created_at timestamptz not null default now(),
  unique (owner_id, slug)
);

-- --------------------------------------------------------------------------
-- meetings: one row per uploaded/recorded meeting
-- --------------------------------------------------------------------------
create type meeting_status as enum (
  'uploading', 'queued', 'transcribing', 'transcribed',
  'summarizing', 'ready', 'failed'
);

create type meeting_source as enum (
  'upload', 'browser_record', 'desktop_app', 'mobile_app', 'meeting_bot'
);

create table if not exists public.meetings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null default 'Untitled meeting',
  source meeting_source not null default 'upload',
  status meeting_status not null default 'uploading',
  audio_path text,                       -- storage path inside the 'recordings' bucket
  duration_seconds integer,
  language text default 'en',
  template_id uuid references public.templates(id) on delete set null,
  transcript_text text,                  -- full plain-text transcript (denormalised for search)
  summary jsonb,                          -- { section_key: markdown_string, ... }
  error text,
  recall_bot_id text,                     -- set when source = 'meeting_bot'
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists meetings_owner_created_idx
  on public.meetings (owner_id, created_at desc);

create index if not exists meetings_recall_bot_idx
  on public.meetings (recall_bot_id);

-- --------------------------------------------------------------------------
-- segments: one row per diarized utterance
-- --------------------------------------------------------------------------
create table if not exists public.segments (
  id bigserial primary key,
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  speaker integer not null,
  start_seconds numeric(10, 3) not null,
  end_seconds numeric(10, 3) not null,
  text text not null
);

create index if not exists segments_meeting_idx on public.segments (meeting_id, start_seconds);

-- --------------------------------------------------------------------------
-- updated_at trigger
-- --------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists meetings_touch_updated on public.meetings;
create trigger meetings_touch_updated
  before update on public.meetings
  for each row execute procedure public.touch_updated_at();

-- --------------------------------------------------------------------------
-- profile auto-create on signup
-- --------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- --------------------------------------------------------------------------
-- Row-level security
-- --------------------------------------------------------------------------
alter table public.profiles  enable row level security;
alter table public.meetings  enable row level security;
alter table public.segments  enable row level security;
alter table public.templates enable row level security;

drop policy if exists "profiles: read own" on public.profiles;
create policy "profiles: read own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own" on public.profiles
  for update using (auth.uid() = id);

drop policy if exists "meetings: owner full access" on public.meetings;
create policy "meetings: owner full access" on public.meetings
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists "segments: via meeting ownership" on public.segments;
create policy "segments: via meeting ownership" on public.segments
  for all
  using (exists (select 1 from public.meetings m where m.id = segments.meeting_id and m.owner_id = auth.uid()))
  with check (exists (select 1 from public.meetings m where m.id = segments.meeting_id and m.owner_id = auth.uid()));

drop policy if exists "templates: read built-in or own" on public.templates;
create policy "templates: read built-in or own" on public.templates
  for select using (owner_id is null or owner_id = auth.uid());

drop policy if exists "templates: write own" on public.templates;
create policy "templates: write own" on public.templates
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- --------------------------------------------------------------------------
-- Storage bucket for raw audio (private; access is via signed URLs).
-- --------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('recordings', 'recordings', false)
on conflict (id) do nothing;

drop policy if exists "recordings: owner read" on storage.objects;
create policy "recordings: owner read" on storage.objects
  for select using (
    bucket_id = 'recordings'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "recordings: owner write" on storage.objects;
create policy "recordings: owner write" on storage.objects
  for insert with check (
    bucket_id = 'recordings'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "recordings: owner delete" on storage.objects;
create policy "recordings: owner delete" on storage.objects
  for delete using (
    bucket_id = 'recordings'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- --------------------------------------------------------------------------
-- Seed: built-in templates (owner_id null = visible to all signed-in users).
-- --------------------------------------------------------------------------
insert into public.templates (owner_id, slug, name, description, sections, prompt, is_premium) values
  (null, 'general', 'General meeting',
   'Balanced summary, decisions and action items — works for almost any call.',
   '[{"key":"overview","label":"Overview"},{"key":"decisions","label":"Decisions"},{"key":"actions","label":"Action items"},{"key":"questions","label":"Open questions"}]'::jsonb,
   'Write a balanced summary of the meeting. Capture decisions, who owns each action item with a due date if mentioned, and any questions that were raised but not resolved. Stay faithful to what was actually said — do not invent action items.',
   false),

  (null, 'sales-call', 'Sales call',
   'BANT-style write-up for a discovery or qualification call.',
   '[{"key":"prospect","label":"Prospect & company"},{"key":"pain","label":"Pain points"},{"key":"budget","label":"Budget & authority"},{"key":"timing","label":"Timing & next step"},{"key":"objections","label":"Objections"}]'::jsonb,
   'Treat this as a sales call. For each section, only include what was explicitly discussed. Note buying signals and red flags. Next step must be a concrete commitment.',
   false),

  (null, 'standup', 'Standup',
   'Yesterday / today / blockers per person.',
   '[{"key":"updates","label":"Per-person updates"},{"key":"blockers","label":"Blockers"},{"key":"asks","label":"Asks for the team"}]'::jsonb,
   'Summarise as a standup. Under "Per-person updates", produce a sub-list per speaker with what they did yesterday, what they plan to do today, and any blockers. Keep it terse.',
   false),

  (null, 'one-on-one', '1:1',
   'Manager / report check-in: themes, growth, follow-ups.',
   '[{"key":"themes","label":"Themes"},{"key":"growth","label":"Growth & feedback"},{"key":"followups","label":"Follow-ups"}]'::jsonb,
   'This is a 1:1 between a manager and a direct report. Identify recurring themes (workload, career, team dynamics). Capture feedback exchanged in either direction. Follow-ups should be small, concrete commitments.',
   false),

  (null, 'interview', 'Interview',
   'Candidate evaluation: signals, concerns, recommendation.',
   '[{"key":"role","label":"Role & candidate"},{"key":"signals","label":"Positive signals"},{"key":"concerns","label":"Concerns"},{"key":"recommendation","label":"Recommendation"}]'::jsonb,
   'Treat this as a hiring interview. Be neutral and evidence-based — quote the candidate where you can. Recommendation should be one of: strong hire, hire, no hire, strong no hire, with a one-sentence rationale.',
   false),

  (null, 'customer-discovery', 'Customer discovery',
   'Jobs-to-be-done style notes from a research interview.',
   '[{"key":"job","label":"Job-to-be-done"},{"key":"current-solution","label":"Current solution & workarounds"},{"key":"pain","label":"Pain points & frustrations"},{"key":"willingness","label":"Willingness to pay / change"},{"key":"quotes","label":"Memorable quotes"}]'::jsonb,
   'You are taking notes for a customer discovery interview. Stay close to the participant''s own language. Include 2-5 verbatim quotes that capture the strongest feelings.',
   false),

  (null, 'board', 'Board meeting',
   'Minutes-style: attendance, motions, decisions, follow-ups.',
   '[{"key":"attendance","label":"Attendance"},{"key":"matters","label":"Matters discussed"},{"key":"decisions","label":"Resolutions & decisions"},{"key":"followups","label":"Follow-ups"}]'::jsonb,
   'Produce minutes in a formal register. Use past tense. Resolutions should be numbered. Do not infer attendance — only list speakers we actually heard.',
   false),

  (null, 'retro', 'Retro',
   'What went well / what didn''t / experiments to try.',
   '[{"key":"went-well","label":"Went well"},{"key":"didnt","label":"Didn''t go well"},{"key":"experiments","label":"Experiments to try"}]'::jsonb,
   'Summarise as a retrospective. Group similar points. Experiments should be specific enough to commit to before the next retro.',
   false)
on conflict (owner_id, slug) do nothing;
