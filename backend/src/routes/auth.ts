import { randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
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
import { readLocalAuthUsers, upsertLocalAuthUser, type LocalAuthUser } from '../lib/local-mirror.js';

const execFileAsync = promisify(execFile);
const scrypt = promisify(scryptCallback);
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

function slugify(value: string) {
  const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  return slug || 'northstar-user';
}

async function hashPassword(password: string, salt = randomBytes(16).toString('hex')) {
  const hash = (await scrypt(password, salt, 64)) as Buffer;
  return { salt, hash: hash.toString('hex') };
}

async function verifyPassword(password: string, salt: string, expectedHash: string) {
  const { hash } = await hashPassword(password, salt);
  const actual = Buffer.from(hash, 'hex');
  const expected = Buffer.from(expectedHash, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

async function findLocalAuthUser(email: string) {
  const users = await readLocalAuthUsers();
  return users.find((user) => user.email === email) ?? null;
}

async function findAuthUser(email: string): Promise<LocalAuthUser | null> {
  const { data, error } = await supabase
    .from('demo_auth_users')
    .select('email,user_id,name,password_hash,password_salt,created_at,updated_at')
    .eq('email', email)
    .maybeSingle();

  if (!error && data) {
    return {
      email: data.email as string,
      userId: data.user_id as string,
      name: data.name as string,
      passwordHash: data.password_hash as string,
      passwordSalt: data.password_salt as string,
      createdAt: data.created_at as string,
      updatedAt: data.updated_at as string,
    };
  }

  return findLocalAuthUser(email);
}

async function buildRandomSeed(input: { userId: string; name: string; email: string }) {
  const outDir = join(generatedSeedDir, input.userId);
  const outPath = join(outDir, 'demo-seed.json');
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

authRouter.post('/register', async (req, res, next) => {
  try {
    const body = registerSchema.parse(req.body);
    const existing = await findAuthUser(body.email);
    if (existing) {
      res.status(409).json({ ok: false, code: 'USER_EXISTS', message: 'Account already exists. Log in instead.' });
      return;
    }

    const userId = `${slugify(body.email.split('@')[0])}-${randomUUID().slice(0, 8)}`;
    const seed = await buildRandomSeed({ userId, name: body.name, email: body.email });
    await persistDemoSeed(seed);

    const now = new Date().toISOString();
    const { salt, hash } = await hashPassword(body.password);
    const authUser: LocalAuthUser = {
      userId,
      email: body.email,
      name: body.name,
      passwordHash: hash,
      passwordSalt: salt,
      createdAt: now,
      updatedAt: now,
    };

    const { error } = await supabase.from('demo_auth_users').insert({
      email: authUser.email,
      user_id: authUser.userId,
      name: authUser.name,
      password_hash: authUser.passwordHash,
      password_salt: authUser.passwordSalt,
      created_at: authUser.createdAt,
      updated_at: authUser.updatedAt,
    });
    if (error) throw error;

    await upsertLocalAuthUser(authUser);

    const response: AuthUserSession = {
      ok: true,
      userId,
      email: body.email,
      name: body.name,
    };
    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
});

authRouter.post('/login', async (req, res, next) => {
  try {
    const body = loginSchema.parse(req.body);
    const user = await findAuthUser(body.email);
    if (!user) {
      res.status(404).json({
        ok: false,
        code: 'USER_NOT_FOUND',
        message: 'User not found. Create a new account instead?',
      });
      return;
    }

    const passwordOk = await verifyPassword(body.password, user.passwordSalt, user.passwordHash);
    if (!passwordOk) {
      res.status(401).json({ ok: false, code: 'INVALID_PASSWORD', message: 'Password is incorrect. Try again or recover your password.' });
      return;
    }

    const response: AuthUserSession = {
      ok: true,
      userId: user.userId,
      email: user.email,
      name: user.name,
    };
    res.json(response);
  } catch (error) {
    next(error);
  }
});

authRouter.post('/recover', async (req, res, next) => {
  try {
    const body = recoverSchema.parse(req.body);
    const user = await findAuthUser(body.email);
    const response: AuthRecoverResponse = {
      ok: true,
      found: Boolean(user),
      message: user
        ? 'Recovery options are ready. For this mock build, create a new password from the demo admin flow.'
        : 'No account exists for that email. Create a new account instead?',
    };
    res.json(response);
  } catch (error) {
    next(error);
  }
});
