create extension if not exists pgcrypto;

create table if not exists public.demo_users (
  id text primary key,
  name text not null,
  age integer not null check (age > 0),
  investor_level text not null,
  communication_style text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.accounts (
  id text primary key,
  user_id text not null references public.demo_users(id) on delete cascade,
  name text not null,
  account_type text not null check (account_type in ('brokerage', 'mutual_fund', 'cash')),
  taxable boolean not null default true,
  balance numeric(14, 2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.context_packets (
  user_id text primary key references public.demo_users(id) on delete cascade,
  packet jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.memory_documents (
  user_id text primary key references public.demo_users(id) on delete cascade,
  content text not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.agent_traces (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null,
  user_id text references public.demo_users(id) on delete cascade,
  event_type text not null,
  agent text not null,
  label text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.trust_receipts (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.demo_users(id) on delete cascade,
  run_id uuid,
  title text not null,
  content jsonb not null,
  approval_status text not null default 'approval_required',
  created_at timestamptz not null default now()
);

create index if not exists accounts_user_id_idx on public.accounts(user_id);
create index if not exists agent_traces_run_id_created_at_idx on public.agent_traces(run_id, created_at);
create index if not exists trust_receipts_user_id_created_at_idx on public.trust_receipts(user_id, created_at desc);

alter table public.demo_users enable row level security;
alter table public.accounts enable row level security;
alter table public.context_packets enable row level security;
alter table public.memory_documents enable row level security;
alter table public.agent_traces enable row level security;
alter table public.trust_receipts enable row level security;

create policy "hackathon demo access demo_users"
  on public.demo_users for all
  to anon, authenticated
  using (true)
  with check (true);

create policy "hackathon demo access accounts"
  on public.accounts for all
  to anon, authenticated
  using (true)
  with check (true);

create policy "hackathon demo access context_packets"
  on public.context_packets for all
  to anon, authenticated
  using (true)
  with check (true);

create policy "hackathon demo access memory_documents"
  on public.memory_documents for all
  to anon, authenticated
  using (true)
  with check (true);

create policy "hackathon demo access agent_traces"
  on public.agent_traces for all
  to anon, authenticated
  using (true)
  with check (true);

create policy "hackathon demo access trust_receipts"
  on public.trust_receipts for all
  to anon, authenticated
  using (true)
  with check (true);
