import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { Router } from 'express';
import { z } from 'zod';
import type {
  AuthLoginRequest,
  AuthRecoverRequest,
  AuthRecoverResponse,
  AuthRegisterRequest,
  AuthUserSession,
  DemoSeed,
} from '@calmvest/shared';
import { persistDemoSeed } from '../lib/demo-persistence.js';
import { supabase, supabaseAuth, withSupabaseUser } from '../lib/supabase.js';
import { upsertLocalAuthUser, type LocalAuthUser } from '../lib/local-mirror.js';

const execFileAsync = promisify(execFile);
const currentDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(currentDir, '..', '..', '..');
const generatedSeedDir = join(currentDir, '..', 'data', 'generated-auth');
const fixtureAsOf = '2026-05-02';

export const authRouter = Router();

const registerSchema = z.object({
  name: z.string().trim().min(2),
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  password: z.string()
    .min(8)
    .regex(/[0-9]/, 'Password must include a number.')
    .regex(/[^A-Za-z0-9]/, 'Password must include a special character.'),
}) satisfies z.ZodType<AuthRegisterRequest>;

const loginSchema = z.object({
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  password: z.string().min(1),
}) satisfies z.ZodType<AuthLoginRequest>;

const recoverSchema = z.object({
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
}) satisfies z.ZodType<AuthRecoverRequest>;

async function buildRandomSeed(input: { userId: string; name: string; email: string }) {
  const outDir = join(generatedSeedDir, input.userId);
  const outPath = join(outDir, 'seed.json');
  await mkdir(outDir, { recursive: true });

  const scriptPath = join(projectRoot, 'scripts', 'generate_demo_seed.py');
  await execFileAsync('python', [
    scriptPath,
    '--out',
    outPath,
    '--user-id',
    input.userId,
    '--name',
    input.name,
    '--email',
    input.email,
    '--seed',
    String(stableSeed(input.userId)),
    '--randomize',
    '--as-of',
    fixtureAsOf,
  ]);

  return JSON.parse(await readFile(outPath, 'utf-8')) as DemoSeed;
}

function stableSeed(value: string) {
  return Number.parseInt(createHash('sha256').update(value).digest('hex').slice(0, 8), 16);
}

async function findProfileByUserId(userId: string) {
  const { data, error } = await supabase
    .from('demo_auth_users')
    .select('email,user_id,name,created_at,updated_at,supabase_user_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function provisionUser(input: { userId: string; name: string; email: string }) {
  const existing = await findProfileByUserId(input.userId);
  if (existing) return existing;

  const seed = await buildRandomSeed(input);
  await persistDemoSeed(seed, { persistMemory: false });
  await persistAuthProfile({
    email: input.email,
    name: input.name,
    userId: input.userId,
    supabaseUserId: input.userId,
  });
  return findProfileByUserId(input.userId);
}

async function persistAuthProfile(input: {
  email: string;
  name: string;
  userId: string;
  supabaseUserId: string;
}) {
  const now = new Date().toISOString();
  const { error } = await supabase.from('demo_auth_users').upsert({
    email: input.email,
    user_id: input.userId,
    name: input.name,
    supabase_user_id: input.supabaseUserId,
    created_at: now,
    updated_at: now,
  });
  if (error) throw error;

  const localAuthUser: LocalAuthUser = {
    userId: input.userId,
    email: input.email,
    name: input.name,
    passwordHash: 'supabase-auth',
    passwordSalt: input.supabaseUserId,
    createdAt: now,
    updatedAt: now,
  };
  await upsertLocalAuthUser(localAuthUser);
}

function sessionResponse(input: {
  userId: string;
  email: string;
  name: string;
  accessToken?: string;
  requiresEmailConfirmation?: boolean;
}): AuthUserSession {
  return {
    ok: true,
    userId: input.userId,
    email: input.email,
    name: input.name,
    accessToken: input.accessToken,
    requiresEmailConfirmation: input.requiresEmailConfirmation,
  };
}

authRouter.post('/register', async (req, res, next) => {
  try {
    const body = registerSchema.parse(req.body);
    const { data, error } = await supabaseAuth.auth.signUp({
      email: body.email,
      password: body.password,
      options: {
        data: {
          name: body.name,
        },
      },
    });
    if (error) throw error;
    if (!data.user) throw new Error('Supabase Auth did not return a user.');
    if (data.user.identities && data.user.identities.length === 0) {
      res.status(409).json({ ok: false, code: 'USER_EXISTS', message: 'Account already exists. Log in instead.' });
      return;
    }

    const userId = data.user.id;
    const accessToken = data.session?.access_token;
    if (accessToken) {
      await withSupabaseUser(accessToken, () => provisionUser({ userId, name: body.name, email: body.email }));
    }

    res.status(201).json(sessionResponse({
      userId,
      email: body.email,
      name: body.name,
      accessToken,
      requiresEmailConfirmation: !accessToken,
    }));
  } catch (error) {
    next(error);
  }
});

authRouter.post('/login', async (req, res, next) => {
  try {
    const body = loginSchema.parse(req.body);
    const { data, error } = await supabaseAuth.auth.signInWithPassword({
      email: body.email,
      password: body.password,
    });
    if (error) {
      res.status(401).json({ ok: false, code: 'INVALID_LOGIN', message: error.message });
      return;
    }
    if (!data.user) throw new Error('Supabase Auth did not return a user.');

    const accessToken = data.session?.access_token;
    if (!accessToken) throw new Error('Supabase Auth did not return an access token.');

    const metadataName = typeof data.user.user_metadata?.name === 'string'
      ? data.user.user_metadata.name.trim()
      : '';
    const profile = await withSupabaseUser(accessToken, async () => {
      return provisionUser({
        userId: data.user.id,
        email: body.email,
        name: metadataName || body.email.split('@')[0] || 'Northstar user',
      });
    });
    if (!profile) {
      res.status(404).json({
        ok: false,
        code: 'PROFILE_NOT_FOUND',
        message: 'Auth user exists, but Northstar profile data was not found.',
      });
      return;
    }

    res.json(sessionResponse({
      userId: profile.user_id as string,
      email: body.email,
      name: profile.name as string,
      accessToken,
    }));
  } catch (error) {
    next(error);
  }
});

authRouter.post('/recover', async (req, res, next) => {
  try {
    const body = recoverSchema.parse(req.body);
    await supabaseAuth.auth.resetPasswordForEmail(body.email);
    const response: AuthRecoverResponse = {
      ok: true,
      requested: true,
      message: 'If an account exists for this email, Supabase has sent password recovery instructions.',
    };
    res.json(response);
  } catch (error) {
    next(error);
  }
});
