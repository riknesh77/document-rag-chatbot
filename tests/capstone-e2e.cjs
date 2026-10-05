// Run against a local or deployed app. Creates isolated test accounts; credentials
// are random, stay in memory, and are never printed or committed.
const assert = require('node:assert/strict');
const { randomUUID, randomBytes } = require('node:crypto');
const { DEMO_TEXT } = require('../lib/demo');
const base = process.env.TEST_BASE_URL || 'http://localhost:3100';
async function run() {
  const password = randomBytes(24).toString('base64url');
  const email = `capstone-test-${randomUUID()}@example.invalid`;
  let cookie = '';
  async function call(path, body, { method = body ? 'POST' : 'GET', useCookie = true, origin = base } = {}) {
    const response = await fetch(base + path, { method, redirect: 'manual', signal: AbortSignal.timeout(300000), headers: { ...(useCookie && cookie && { Cookie: cookie }), ...(body && { 'Content-Type': 'application/json', Origin: origin }) }, ...(body && { body: JSON.stringify(body) }) });
    const setCookie = response.headers.get('set-cookie');
    if (setCookie && useCookie) cookie = setCookie.split(';')[0];
    const data = (response.headers.get('content-type') || '').includes('application/json') ? await response.json() : null;
    return { response, data, status: response.status };
  }
  assert.equal((await call('/api/documents')).status, 401);
  assert.equal((await call('/dashboard')).status, 307);
  assert.equal((await call('/api/auth', { action: 'signup', name: 'Test builder', email, password })).status, 201);
  assert.equal((await call('/api/auth')).data.user.email, email);
  assert.equal((await call('/api/documents')).data.documents.length, 0);
  const created = await call('/api/briefs', { action: 'create', title: 'Verification brief', content: DEMO_TEXT });
  assert.equal(created.status, 201);
  const id = created.data.documentId;
  assert.equal((await call(`/api/briefs?id=${id}`)).data.document.content, DEMO_TEXT);
  assert.equal((await call(`/api/briefs?id=${id}`, undefined, { useCookie: false })).status, 401);
  assert.equal((await call('/api/briefs', { action: 'create', title: 'Hostile origin', content: DEMO_TEXT }, { origin: 'https://evil.example' })).status, 403);
  assert.equal((await call('/api/briefs', { action: 'create', title: '', content: 'short' })).status, 400);
  if (process.env.TEST_AI === '1') {
    const extracted = await call('/api/briefs', { action: 'extract', documentId: id });
    assert.equal(extracted.status, 200, `AI extraction failed: ${extracted.data?.error}`);
    const brief = (await call(`/api/briefs?id=${id}`)).data.document;
    assert.ok(brief.requirements.length >= 4);
    assert.ok(brief.requirements.every(item => DEMO_TEXT.includes(item.quote)));
    assert.equal((await call('/api/briefs', { documentId: id, requirementId: brief.requirements[0].id, done: true }, { method: 'PATCH' })).status, 200);
    assert.equal((await call(`/api/briefs?id=${id}`)).data.document.requirements[0].done, true);
    const indexed = await call('/api/briefs', { action: 'index', documentId: id });
    assert.equal(indexed.status, 200, `Indexing failed: ${indexed.data?.error}`);
    const answer = await call('/api/chat', { documentId: id, question: 'What is the pilot budget?' });
    assert.equal(answer.status, 200, `Chat failed: ${answer.data?.error}`);
    assert.ok(answer.data.grounded && answer.data.answer.includes('2,000'));
    assert.ok(answer.data.sources.every(source => source.documentId === id));
    assert.equal((await call(`/api/briefs?id=${id}`)).data.document.answers.length, 1);
    console.log('PASS live AI extraction, exact quotes, persisted progress, pgvector indexing, grounded answer and saved history');
  }
  const ownerCookie = cookie;
  assert.equal((await call('/api/auth', { action: 'logout' })).status, 200);
  assert.equal((await call('/api/documents')).status, 401);
  assert.equal((await call('/api/auth', { action: 'login', email, password: 'wrong password' })).status, 401);
  assert.equal((await call('/api/auth', { action: 'login', email, password })).status, 200);
  assert.equal((await call('/api/documents')).data.documents[0].id, id);
  await call('/api/auth', { action: 'logout' });
  await call('/api/auth', { action: 'demo' });
  assert.equal((await call(`/api/briefs?id=${id}`)).status, 404);
  assert.equal((await call('/api/briefs', { action: 'extract', documentId: id })).status, 404);
  assert.equal((await call('/api/chat', { documentId: id, question: 'What is the budget?' })).status, 404);
  const sample = (await call('/api/documents')).data.documents[0];
  const sampleDetails = (await call(`/api/briefs?id=${sample.id}`)).data.document;
  assert.equal(sampleDetails.requirements.length, 7);
  const requirementId = sampleDetails.requirements[0].id;
  assert.equal((await call('/api/briefs', { documentId: sample.id, requirementId, done: true }, { method: 'PATCH' })).status, 200);
  assert.equal((await call(`/api/briefs?id=${sample.id}`)).data.document.requirements[0].done, true);
  cookie = ownerCookie;
  assert.equal((await call('/api/documents')).status, 401, 'Old logout token must be revoked');
  console.log('PASS signup, login, logout/revocation, private persisted briefs, cross-user read/write/chat isolation, origin checks, validation and isolated demo progress');
  console.log(`Test account identifier for cleanup: ${email}`);
}
run().catch(error => { console.error(error.message); process.exitCode = 1; });
