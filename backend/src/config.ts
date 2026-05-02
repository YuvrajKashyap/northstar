import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().default(8787),
  SUPABASE_URL: z.string().url(),
  SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  OPENROUTER_API_KEY: z.string().optional(),
  FINANCIAL_DATASETS_API_KEY: z.string().optional(),
  EXASEARCH_API_KEY: z.string().optional(),
});

export const config = envSchema.parse(process.env);
