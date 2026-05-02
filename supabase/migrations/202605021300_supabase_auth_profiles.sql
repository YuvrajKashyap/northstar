alter table public.accounts
  add column if not exists institution text;

alter table public.demo_auth_users
  add column if not exists supabase_user_id uuid;

alter table public.demo_auth_users
  alter column password_hash drop not null,
  alter column password_salt drop not null;

create index if not exists demo_auth_users_supabase_user_id_idx
  on public.demo_auth_users(supabase_user_id);
