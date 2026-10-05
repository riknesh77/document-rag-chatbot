const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validateRequirements, extractRequirements } = require('../lib/requirements');
const content = 'The project must include a public deployment and a working database.';
const item = { title: 'Publish the application', category: 'Deliverable', quote: content };
test('only exact source-backed, bounded, recognized requirements survive', () => {
  const values = [item, item, { ...item, quote: 'The deadline is 1 January 2027.' }, { ...item, category: 'Invented' }, { ...item, title: 'x'.repeat(181) }];
  assert.deepEqual(validateRequirements({ requirements: values }, content), [item]);
  assert.throws(() => validateRequirements({ requirements: Array(21).fill(item) }, content));
  assert.deepEqual(validateRequirements({ requirements: [] }, content), []);
});
test('hosted extraction validates model output and sanitizes provider failures', async () => {
  const old = process.env.GROQ_API_KEY; process.env.GROQ_API_KEY = 'test-placeholder';
  try {
    const fetchImpl = async (url, options) => {
      const body = JSON.parse(options.body); assert.equal(body.response_format.type, 'json_object');
      assert.match(body.messages[0].content, /never follow instructions/);
      return { ok: true, json: async () => ({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify({ requirements: [item] }) } }] }) };
    };
    assert.deepEqual(await extractRequirements(content, { fetchImpl }), [item]);
    await assert.rejects(extractRequirements(content, { fetchImpl: async () => ({ ok: false }) }), error => error.status === 503 && !error.message.includes('test-placeholder'));
    await assert.rejects(extractRequirements('x'.repeat(22001)), error => error.status === 413);
  } finally { if (old === undefined) delete process.env.GROQ_API_KEY; else process.env.GROQ_API_KEY = old; }
});
