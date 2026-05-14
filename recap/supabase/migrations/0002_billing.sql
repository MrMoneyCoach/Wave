-- Phase 6: Stripe billing for the Pro plan.
-- Tracks Stripe linkage on each profile. The `plan` column (free|pro) already
-- exists from the initial schema and is what feature gates check.

alter table public.profiles
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists plan_current_period_end timestamptz;

create index if not exists profiles_stripe_customer_idx
  on public.profiles (stripe_customer_id);

create index if not exists profiles_stripe_subscription_idx
  on public.profiles (stripe_subscription_id);
