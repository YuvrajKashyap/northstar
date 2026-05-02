import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { config } from '../config.js';

export const healthRouter = Router();

healthRouter.get('/', async (_req, res) => {
  const hasOpenRouterKey = Boolean(config.OPENROUTER_API_KEY);
  const { error } = await supabase.from('demo_users').select('id').limit(1);

  res.json({
    ok: true,
    service: 'calmvest-api',
    supabase: error ? { connected: false, message: error.message } : { connected: true },
    openrouter: { configured: hasOpenRouterKey },
  });
});
