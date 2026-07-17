import assert from 'node:assert/strict';
import test from 'node:test';
import { HttpError } from '../http/errors.js';
import { assertOwnedUserId, parseBearerToken } from './identity.js';

test('parseBearerToken accepts a case-insensitive Bearer token', () => {
  assert.equal(parseBearerToken('bearer signed-token'), 'signed-token');
  assert.equal(parseBearerToken('Basic credentials'), null);
  assert.equal(parseBearerToken(undefined), null);
});

test('assertOwnedUserId rejects missing and cross-user identities', () => {
  assert.throws(() => assertOwnedUserId(undefined, 'user-a'), (error) => {
    return error instanceof HttpError && error.status === 401;
  });
  assert.throws(() => assertOwnedUserId('user-a', 'user-b'), (error) => {
    return error instanceof HttpError && error.status === 403;
  });
  assert.equal(assertOwnedUserId('user-a', 'user-a'), 'user-a');
  assert.equal(assertOwnedUserId('user-a'), 'user-a');
});
