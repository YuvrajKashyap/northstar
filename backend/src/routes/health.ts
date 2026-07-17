import { Router } from 'express';
import { config } from '../config.js';

export const healthRouter = Router();

healthRouter.get('/', async (_req, res) => {
  const hasOpenRouterKey = Boolean(config.OPENROUTER_API_KEY);
  const supabaseHealth = await fetch(`${config.SUPABASE_URL}/auth/v1/health`, {
    headers: { apikey: config.SUPABASE_PUBLISHABLE_KEY },
    signal: AbortSignal.timeout(3_000),
  })
    .then((response) => ({ connected: response.ok, status: response.status }))
    .catch(() => ({ connected: false }));

  res.json({
    ok: true,
    service: 'northstar-api',
    supabase: supabaseHealth,
    openrouter: { configured: hasOpenRouterKey },
  });
});
