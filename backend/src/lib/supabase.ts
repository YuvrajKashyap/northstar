import { AsyncLocalStorage } from 'node:async_hooks';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config.js';

const clientOptions = {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
};

export const supabaseAuth = createClient(
  config.SUPABASE_URL,
  config.SUPABASE_PUBLISHABLE_KEY,
  clientOptions,
);

const requestClients = new AsyncLocalStorage<SupabaseClient>();

export function withSupabaseUser<T>(accessToken: string, callback: () => T): T {
  const client = createClient(config.SUPABASE_URL, config.SUPABASE_PUBLISHABLE_KEY, {
    ...clientOptions,
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  });
  return requestClients.run(client, callback);
}

function activeClient() {
  return requestClients.getStore() ?? supabaseAuth;
}

// Existing data modules use this facade. Within an authenticated request it resolves
// to that user's JWT-scoped client, so Postgres RLS remains the final authorization layer.
export const supabase = new Proxy(supabaseAuth, {
  get(_target, property) {
    const client = activeClient();
    const value = Reflect.get(client, property, client);
    return typeof value === 'function' ? value.bind(client) : value;
  },
}) as SupabaseClient;
