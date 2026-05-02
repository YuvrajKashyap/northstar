create table if not exists public.demo_auth_users (
  email text primary key,
  user_id text not null references public.demo_users(id) on delete cascade,
  name text not null,
  password_hash text not null,
  password_salt text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists demo_auth_users_user_id_idx on public.demo_auth_users(user_id);

alter table public.demo_auth_users enable row level security;

create policy "hackathon demo access demo_auth_users"
  on public.demo_auth_users for all
  to anon, authenticated
  using (true)
  with check (true);
