-- Phase 7: sharing, comments, and integrations.

-- Public share token: when set, the meeting is viewable at /share/<token>
-- without authentication (the page reads it via the service-role client).
alter table public.meetings
  add column if not exists public_share_token text;

create unique index if not exists meetings_public_share_token_idx
  on public.meetings (public_share_token)
  where public_share_token is not null;

-- Per-user shares: grant a specific teammate read access by email.
create table if not exists public.meeting_shares (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  shared_with_email text not null,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (meeting_id, shared_with_email)
);
create index if not exists meeting_shares_meeting_idx on public.meeting_shares (meeting_id);
create index if not exists meeting_shares_email_idx on public.meeting_shares (lower(shared_with_email));

-- Comment threads on a meeting.
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  author_email text not null,
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index if not exists comments_meeting_idx on public.comments (meeting_id, created_at);

-- Per-user integration config.
alter table public.profiles
  add column if not exists slack_webhook_url text,
  add column if not exists notion_token text,
  add column if not exists notion_parent_page_id text;

-- RLS ---------------------------------------------------------------------
alter table public.meeting_shares enable row level security;
alter table public.comments enable row level security;

-- A logged-in user's email, lower-cased, for share matching.
-- (auth.jwt() ->> 'email' is null for anon; coalesce keeps comparisons sane.)

drop policy if exists "meetings: shared read" on public.meetings;
create policy "meetings: shared read" on public.meetings
  for select using (
    exists (
      select 1 from public.meeting_shares ms
      where ms.meeting_id = meetings.id
        and lower(ms.shared_with_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  );

drop policy if exists "segments: shared read" on public.segments;
create policy "segments: shared read" on public.segments
  for select using (
    exists (
      select 1 from public.meeting_shares ms
      where ms.meeting_id = segments.meeting_id
        and lower(ms.shared_with_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  );

drop policy if exists "meeting_shares: owner manage" on public.meeting_shares;
create policy "meeting_shares: owner manage" on public.meeting_shares
  for all
  using (
    exists (select 1 from public.meetings m where m.id = meeting_shares.meeting_id and m.owner_id = auth.uid())
  )
  with check (
    exists (select 1 from public.meetings m where m.id = meeting_shares.meeting_id and m.owner_id = auth.uid())
  );

drop policy if exists "meeting_shares: shared user reads own" on public.meeting_shares;
create policy "meeting_shares: shared user reads own" on public.meeting_shares
  for select using (
    lower(shared_with_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

-- A meeting is "visible" to a user if they own it or it's shared with them.
drop policy if exists "comments: read via meeting access" on public.comments;
create policy "comments: read via meeting access" on public.comments
  for select using (
    exists (select 1 from public.meetings m where m.id = comments.meeting_id and m.owner_id = auth.uid())
    or exists (
      select 1 from public.meeting_shares ms
      where ms.meeting_id = comments.meeting_id
        and lower(ms.shared_with_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  );

drop policy if exists "comments: insert by author" on public.comments;
create policy "comments: insert by author" on public.comments
  for insert with check (
    author_id = auth.uid()
    and (
      exists (select 1 from public.meetings m where m.id = comments.meeting_id and m.owner_id = auth.uid())
      or exists (
        select 1 from public.meeting_shares ms
        where ms.meeting_id = comments.meeting_id
          and lower(ms.shared_with_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
    )
  );

drop policy if exists "comments: delete own" on public.comments;
create policy "comments: delete own" on public.comments
  for delete using (author_id = auth.uid());
