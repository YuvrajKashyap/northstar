create table if not exists public.holdings (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.demo_users(id) on delete cascade,
  symbol text not null,
  name text not null,
  asset_class text not null check (asset_class in ('stock', 'etf', 'mutual_fund', 'cash')),
  quantity numeric(16, 4) not null,
  price numeric(14, 2) not null,
  value numeric(14, 2) not null,
  cost_basis numeric(14, 2) not null,
  sector text,
  created_at timestamptz not null default now(),
  unique (user_id, symbol)
);

create table if not exists public.tax_lots (
  id text primary key,
  user_id text not null references public.demo_users(id) on delete cascade,
  symbol text not null,
  acquired_at date not null,
  quantity numeric(16, 4) not null,
  cost_basis numeric(14, 2) not null,
  created_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id text primary key,
  user_id text not null references public.demo_users(id) on delete cascade,
  posted_at date not null,
  account_id text not null,
  description text not null,
  amount numeric(14, 2) not null,
  transaction_type text not null,
  created_at timestamptz not null default now()
);

create index if not exists holdings_user_id_idx on public.holdings(user_id);
create index if not exists tax_lots_user_id_symbol_idx on public.tax_lots(user_id, symbol);
create index if not exists transactions_user_id_posted_at_idx on public.transactions(user_id, posted_at desc);

alter table public.holdings enable row level security;
alter table public.tax_lots enable row level security;
alter table public.transactions enable row level security;

create policy "hackathon demo access holdings"
  on public.holdings for all
  to anon, authenticated
  using (true)
  with check (true);

create policy "hackathon demo access tax_lots"
  on public.tax_lots for all
  to anon, authenticated
  using (true)
  with check (true);

create policy "hackathon demo access transactions"
  on public.transactions for all
  to anon, authenticated
  using (true)
  with check (true);
