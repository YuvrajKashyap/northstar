-- Replace hackathon-wide policies with owner-scoped access. The application sends
-- the signed-in Supabase access token on every private request, so auth.uid() is the
-- authoritative workspace identity at the database boundary.

drop policy if exists "hackathon demo access demo_users" on public.demo_users;
drop policy if exists "hackathon demo access accounts" on public.accounts;
drop policy if exists "hackathon demo access context_packets" on public.context_packets;
drop policy if exists "hackathon demo access memory_documents" on public.memory_documents;
drop policy if exists "hackathon demo access agent_traces" on public.agent_traces;
drop policy if exists "hackathon demo access trust_receipts" on public.trust_receipts;
drop policy if exists "hackathon demo access holdings" on public.holdings;
drop policy if exists "hackathon demo access tax_lots" on public.tax_lots;
drop policy if exists "hackathon demo access transactions" on public.transactions;
drop policy if exists "hackathon demo access demo_auth_users" on public.demo_auth_users;
drop policy if exists "hackathon demo access plans" on public.plans;
drop policy if exists "hackathon demo access plan_steps" on public.plan_steps;

revoke all on table
  public.demo_users,
  public.accounts,
  public.context_packets,
  public.memory_documents,
  public.agent_traces,
  public.trust_receipts,
  public.holdings,
  public.tax_lots,
  public.transactions,
  public.demo_auth_users,
  public.plans,
  public.plan_steps
from anon;

grant select, insert, update, delete on table
  public.demo_users,
  public.accounts,
  public.context_packets,
  public.memory_documents,
  public.trust_receipts,
  public.holdings,
  public.tax_lots,
  public.transactions,
  public.demo_auth_users,
  public.plans,
  public.plan_steps
to authenticated;

grant select, insert on table public.agent_traces to authenticated;

create policy "users own profile"
  on public.demo_users for all to authenticated
  using ((select auth.uid())::text = id)
  with check ((select auth.uid())::text = id);

create policy "users own accounts"
  on public.accounts for all to authenticated
  using ((select auth.uid())::text = user_id)
  with check ((select auth.uid())::text = user_id);

create policy "users own context"
  on public.context_packets for all to authenticated
  using ((select auth.uid())::text = user_id)
  with check ((select auth.uid())::text = user_id);

create policy "users own memory"
  on public.memory_documents for all to authenticated
  using ((select auth.uid())::text = user_id)
  with check ((select auth.uid())::text = user_id);

create policy "users read traces"
  on public.agent_traces for select to authenticated
  using ((select auth.uid())::text = user_id);

create policy "users append traces"
  on public.agent_traces for insert to authenticated
  with check ((select auth.uid())::text = user_id);

create policy "users own receipts"
  on public.trust_receipts for all to authenticated
  using ((select auth.uid())::text = user_id)
  with check ((select auth.uid())::text = user_id);

create policy "users own holdings"
  on public.holdings for all to authenticated
  using ((select auth.uid())::text = user_id)
  with check ((select auth.uid())::text = user_id);

create policy "users own tax lots"
  on public.tax_lots for all to authenticated
  using ((select auth.uid())::text = user_id)
  with check ((select auth.uid())::text = user_id);

create policy "users own transactions"
  on public.transactions for all to authenticated
  using ((select auth.uid())::text = user_id)
  with check ((select auth.uid())::text = user_id);

create policy "users own auth profile"
  on public.demo_auth_users for all to authenticated
  using ((select auth.uid()) = supabase_user_id and (select auth.uid())::text = user_id)
  with check ((select auth.uid()) = supabase_user_id and (select auth.uid())::text = user_id);

create policy "users own plans"
  on public.plans for all to authenticated
  using ((select auth.uid())::text = user_id)
  with check ((select auth.uid())::text = user_id);

create policy "users own plan steps"
  on public.plan_steps for all to authenticated
  using ((select auth.uid())::text = user_id)
  with check ((select auth.uid())::text = user_id);
