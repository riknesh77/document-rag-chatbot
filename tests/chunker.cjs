const { test } = require('node:test');
const assert = require('node:assert/strict');
const { getEncoding } = require('js-tiktoken');
const { chunkText } = require('../lib/chunker');
const enc = getEncoding('cl100k_base');
const encode = text => enc.encode(text, [], []);
const long = Array.from({ length: 900 }, (_, i) => `Section ${i}: a useful sentence.\n`).join('');

test('short document produces one chunk with accurate metadata', () => {
  const text = 'Hello world';
  assert.deepEqual(chunkText(text), [{ index: 0, text, tokenCount: 2, startToken: 0, endToken: 2 }]);
});
test('empty and whitespace-only input produce no chunks', () => {
  for (const text of ['', '  \n\t']) assert.deepEqual(chunkText(text), []);
});
test('exactly 500 tokens produces one chunk; 501 produces two', () => {
  assert.equal(encode(' hello'.repeat(500)).length, 500);
  assert.equal(chunkText(' hello'.repeat(500)).length, 1);
  assert.equal(chunkText(' hello'.repeat(501)).length, 2);
});
test('long text has bounded chunks, 50-token overlap, complete coverage and original ordering', () => {
  const tokens = encode(long);
  const chunks = chunkText(long);
  assert.ok(chunks.length > 1);
  const rebuilt = [];
  chunks.forEach((chunk, index) => {
    assert.equal(chunk.index, index);
    assert.ok(chunk.text.trim());
    assert.equal(chunk.tokenCount, encode(chunk.text).length);
    assert.ok(chunk.tokenCount <= 500);
    assert.equal(chunk.text, enc.decode(tokens.slice(chunk.startToken, chunk.endToken)));
    if (index) {
      const previous = chunks[index - 1];
      assert.equal(previous.endToken - chunk.startToken, 50);
      assert.deepEqual(encode(previous.text).slice(-50), encode(chunk.text).slice(0, 50));
    }
    rebuilt.push(...tokens.slice(index ? chunks[index - 1].endToken : 0, chunk.endToken));
  });
  assert.deepEqual(rebuilt, tokens);
  assert.equal(enc.decode(rebuilt), long);
});
test('Unicode remains intact with bounded size and approximately 50-token overlap', () => {
  const text = '你好世界 🌍 café résumé 日本語 '.repeat(160);
  const tokens = encode(text);
  const chunks = chunkText(text);
  assert.equal(chunks[0].startToken, 0);
  assert.equal(chunks.at(-1).endToken, tokens.length);
  for (const [i, chunk] of chunks.entries()) {
    assert.ok(text.includes(chunk.text));
    assert.ok(!chunk.text.includes('\ufffd'));
    assert.ok(chunk.tokenCount <= 500);
    assert.equal(chunk.tokenCount, encode(chunk.text).length);
    if (i) assert.ok(Math.abs(chunks[i - 1].endToken - chunk.startToken - 50) <= 3);
  }
});
test('special-token-looking document content is ordinary text', () => {
  const text = 'Example <|endoftext|> in a document.';
  assert.equal(chunkText(text)[0].text, text);
});
