-- Phase 5: meeting bot via Recall.ai
-- Adds the Recall bot ID to meetings so the webhook handler can match
-- inbound status_change events back to the row they belong to.

alter table public.meetings
  add column if not exists recall_bot_id text;

create index if not exists meetings_recall_bot_idx
  on public.meetings (recall_bot_id);
