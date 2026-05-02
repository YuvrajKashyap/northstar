create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.demo_users(id) on delete cascade,
  title text not null,
  summary text not null,
  status text not null default 'active' check (status in ('active', 'archived', 'draft')),
  horizon text not null,
  target_date date,
  score integer not null check (score >= 0 and score <= 100),
  confidence jsonb not null default '{}'::jsonb,
  source_metadata jsonb not null default '{}'::jsonb,
  content jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.plan_steps (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  user_id text not null references public.demo_users(id) on delete cascade,
  position integer not null,
  category text not null check (category in ('protect_cash', 'fund_goals', 'reduce_risk', 'tax_review')),
  timing text not null check (timing in ('now', 'next_30_days', 'next_90_days', 'longer_term')),
  title text not null,
  description text not null,
  rationale text not null,
  memory_drivers jsonb not null default '[]'::jsonb,
  impact jsonb not null default '{}'::jsonb,
  approval_required boolean not null default false,
  approval_status text not null default 'not_required' check (approval_status in ('not_required', 'approval_required', 'approved', 'rejected')),
  trust_receipt_id uuid references public.trust_receipts(id) on delete set null,
  changes_if text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (plan_id, position)
);

alter table public.trust_receipts
  add column if not exists plan_id uuid references public.plans(id) on delete set null;

create unique index if not exists plans_one_active_per_user_idx
  on public.plans(user_id)
  where status = 'active';

create index if not exists plans_user_id_updated_at_idx on public.plans(user_id, updated_at desc);
create index if not exists plan_steps_plan_id_position_idx on public.plan_steps(plan_id, position);
create index if not exists plan_steps_user_id_status_idx on public.plan_steps(user_id, approval_status);
create index if not exists trust_receipts_plan_id_idx on public.trust_receipts(plan_id);

alter table public.plans enable row level security;
alter table public.plan_steps enable row level security;

create policy "hackathon demo access plans"
  on public.plans for all
  to anon, authenticated
  using (true)
  with check (true);

create policy "hackathon demo access plan_steps"
  on public.plan_steps for all
  to anon, authenticated
  using (true)
  with check (true);
