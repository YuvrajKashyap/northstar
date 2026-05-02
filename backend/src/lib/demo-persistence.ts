import type { DemoSeed } from '@calmvest/shared';
import { supabase } from './supabase.js';
import { mirrorDemoSeed, mirrorMemory } from './local-mirror.js';

export async function persistDemoSeed(seed: DemoSeed, options: { persistMemory?: boolean } = {}) {
  const persistMemory = options.persistMemory ?? true;

  const { error: userError } = await supabase.from('demo_users').upsert({
    id: seed.user.id,
    name: seed.user.name,
    age: seed.user.age,
    investor_level: seed.user.investor_level,
    communication_style: seed.user.communication_style,
  });
  if (userError) throw userError;

  const { error: accountsError } = await supabase.from('accounts').upsert(
    seed.accounts.map((account) => ({
      id: account.id,
      user_id: seed.user.id,
      institution: account.institution ?? null,
      name: account.name,
      account_type: account.type,
      taxable: account.taxable,
      balance: account.balance,
    })),
  );
  if (accountsError) throw accountsError;

  const { error: holdingsError } = await supabase.from('holdings').upsert(
    seed.holdings.map((holding) => ({
      user_id: seed.user.id,
      symbol: holding.symbol,
      name: holding.name,
      asset_class: holding.assetClass,
      quantity: holding.quantity,
      price: holding.price,
      value: holding.value,
      cost_basis: holding.costBasis,
      sector: holding.sector ?? null,
    })),
    { onConflict: 'user_id,symbol' },
  );
  if (holdingsError) throw holdingsError;

  const { error: taxLotsError } = await supabase.from('tax_lots').upsert(
    seed.taxLots.map((lot) => ({
      id: lot.id,
      user_id: seed.user.id,
      symbol: lot.symbol,
      acquired_at: lot.acquiredAt,
      quantity: lot.quantity,
      cost_basis: lot.costBasis,
    })),
  );
  if (taxLotsError) throw taxLotsError;

  const { error: transactionsError } = await supabase.from('transactions').upsert(
    seed.transactions.map((transaction) => ({
      id: transaction.id,
      user_id: seed.user.id,
      posted_at: transaction.postedAt,
      account_id: transaction.accountId,
      description: transaction.description,
      amount: transaction.amount,
      transaction_type: transaction.type,
    })),
  );
  if (transactionsError) throw transactionsError;

  const { error: contextError } = await supabase.from('context_packets').upsert({
    user_id: seed.user.id,
    packet: seed.contextPacket,
  });
  if (contextError) throw contextError;

  await mirrorDemoSeed(seed);

  if (persistMemory) {
    const { error: memoryError } = await supabase.from('memory_documents').upsert({
      user_id: seed.user.id,
      content: seed.memoryTemplate,
    });
    if (memoryError) throw memoryError;

    await mirrorMemory(seed.user.id, seed.memoryTemplate, seed.contextPacket);
  }
}
