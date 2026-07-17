import { HttpError } from '../http/errors.js';

export function parseBearerToken(value: string | undefined) {
  if (!value) return null;
  const match = /^Bearer\s+(.+)$/i.exec(value.trim());
  return match?.[1]?.trim() || null;
}

export function assertOwnedUserId(authenticatedUserId: string | undefined, requestedUserId?: string | null) {
  if (!authenticatedUserId) throw new HttpError(401, 'Authentication is required.', 'AUTH_REQUIRED');
  if (requestedUserId && requestedUserId !== authenticatedUserId) {
    throw new HttpError(403, 'You cannot access another user\'s Northstar workspace.', 'USER_SCOPE_MISMATCH');
  }
  return authenticatedUserId;
}
