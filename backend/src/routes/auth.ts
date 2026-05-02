import { execFile } from 'node:child_process';
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
import { supabase } from '../lib/supabase.js';
import { upsertLocalAuthUser, type LocalAuthUser } from '../lib/local-mirror.js';

const execFileAsync = promisify(execFile);
const currentDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(currentDir, '..', '..', '..');
const generatedSeedDir = join(currentDir, '..', 'data', 'generated-auth');

export const authRouter = Router();

const registerSchema = z.object({
  name: z.string().trim().min(2),
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  password: z.string().min(8),
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
    String(Date.now()),
    '--randomize',
  ]);

  return JSON.parse(await readFile(outPath, 'utf-8')) as DemoSeed;
}

async function findProfileByEmail(email: string) {
  const { data, error } = await supabase
    .from('demo_auth_users')
    .select('email,user_id,name,created_at,updated_at,supabase_user_id')
    .eq('email', email)
    .maybeSingle();

  if (error) throw error;
  return data;
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
}): AuthUserSession {
  return {
    ok: true,
    userId: input.userId,
    email: input.email,
    name: input.name,
    accessToken: input.accessToken,
  };
}

authRouter.post('/register', async (req, res, next) => {
  try {
    const body = registerSchema.parse(req.body);
    const existingProfile = await findProfileByEmail(body.email);
    if (existingProfile) {
      res.status(409).json({ ok: false, code: 'USER_EXISTS', message: 'Account already exists. Log in instead.' });
      return;
    }

    const { data, error } = await supabase.auth.signUp({
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
    const seed = await buildRandomSeed({ userId, name: body.name, email: body.email });
    await persistDemoSeed(seed, { persistMemory: false });
    await persistAuthProfile({
      email: body.email,
      name: body.name,
      userId,
      supabaseUserId: data.user.id,
    });

    res.status(201).json(sessionResponse({
      userId,
      email: body.email,
      name: body.name,
      accessToken: data.session?.access_token,
    }));
  } catch (error) {
    next(error);
  }
});

authRouter.post('/login', async (req, res, next) => {
  try {
    const body = loginSchema.parse(req.body);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: body.email,
      password: body.password,
    });
    if (error) {
      res.status(401).json({ ok: false, code: 'INVALID_LOGIN', message: error.message });
      return;
    }
    if (!data.user) throw new Error('Supabase Auth did not return a user.');

    const profile = await findProfileByEmail(body.email);
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
      accessToken: data.session?.access_token,
    }));
  } catch (error) {
    next(error);
  }
});

authRouter.post('/recover', async (req, res, next) => {
  try {
    const body = recoverSchema.parse(req.body);
    const profile = await findProfileByEmail(body.email);
    if (profile) {
      await supabase.auth.resetPasswordForEmail(body.email);
    }
    const response: AuthRecoverResponse = {
      ok: true,
      found: Boolean(profile),
      message: profile
        ? 'Password recovery has been requested for this email.'
        : 'No account exists for that email. Create a new account instead?',
    };
    res.json(response);
  } catch (error) {
    next(error);
  }
});
