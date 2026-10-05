const { test } = require('node:test');
const assert = require('node:assert/strict');
const { hashPassword, verifyPassword, checkOrigin, HttpError, tokenHash } = require('../lib/auth');
test('salted password hashes differ and reject incorrect credentials', async () => {
  const a = await hashPassword('correct horse battery');
  const b = await hashPassword('correct horse battery');
  assert.notEqual(a, b); assert.equal(await verifyPassword('correct horse battery', a), true);
  assert.equal(await verifyPassword('incorrect password', a), false);
  assert.equal(await verifyPassword('incorrect password', null), false);
  assert.ok(!a.includes('correct horse'));
});
test('mutating requests reject hostile origins', () => {
  assert.doesNotThrow(() => checkOrigin({ headers: { host: 'briefproof.example', origin: 'https://briefproof.example' } }));
  for (const origin of ['https://evil.example', 'null', 'garbage']) assert.throws(() => checkOrigin({ headers: { host: 'briefproof.example', origin } }), error => error instanceof HttpError && error.status === 403);
  assert.throws(() => checkOrigin({ headers: { 'sec-fetch-site': 'cross-site' } }));
  assert.equal(tokenHash('secret-token').length, 64);
});
