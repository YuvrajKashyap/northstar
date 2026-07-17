import type { NextFunction, Request, Response } from 'express';
import { HttpError } from '../http/errors.js';
import { supabaseAuth, withSupabaseUser } from '../lib/supabase.js';
import { assertOwnedUserId, parseBearerToken } from '../security/identity.js';

export { parseBearerToken } from '../security/identity.js';

declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: string;
        email?: string;
      };
    }
  }
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const accessToken = parseBearerToken(req.header('authorization'));
    if (!accessToken) throw new HttpError(401, 'Authentication is required.', 'AUTH_REQUIRED');

    const { data, error } = await supabaseAuth.auth.getUser(accessToken);
    if (error || !data.user) throw new HttpError(401, 'The session is invalid or expired.', 'INVALID_SESSION');

    req.auth = { userId: data.user.id, email: data.user.email };
    withSupabaseUser(accessToken, () => next());
  } catch (error) {
    next(error);
  }
}

export function requireOwnedUserId(req: Request, requestedUserId?: string | null) {
  return assertOwnedUserId(req.auth?.userId, requestedUserId);
}
