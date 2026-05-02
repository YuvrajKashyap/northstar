import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().default(8787),
  SUPABASE_URL: z.string().url().default('https://pvwekqquowgmdmknthes.supabase.co'),
  SUPABASE_PUBLISHABLE_KEY: z
    .string()
    .default('sb_publishable_xJYaGUMwpq4AbdapCXa-2w_AGaxwTrO'),
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_SITE_URL: z.string().url().default('http://localhost:5173'),
  OPENROUTER_SITE_NAME: z.string().default('CalmVest Agent OS'),
  OPENROUTER_DEFAULT_MODEL: z.string().default('openai/gpt-5.4-mini'),
  OPENROUTER_PREMIUM_MODEL: z.string().default('openai/gpt-5.4'),
  OPENROUTER_FRONTIER_MODEL: z.string().default('openai/gpt-5.5'),
  OPENROUTER_REASONING_EFFORT: z.enum(['none', 'minimal', 'low', 'medium', 'high', 'xhigh']).default('medium'),
});

export const config = envSchema.parse(process.env);
