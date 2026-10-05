const assert = require('node:assert/strict');

// Generate a complete, one-page PDF with a cross-reference table and known text.
function makePdf(text) {
  const lines = text.match(/.{1,70}/g) || [''];
  const height = Math.max(792, lines.length * 16 + 144);
  const stream = `BT /F1 10 Tf 16 TL 72 ${height - 72} Td ` +
    lines.map(line => `(${line}) Tj T*`).join('\n') + ' ET';
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 ${height}] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((obj, i) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 6\n0000000000 65535 f \n`;
  pdf += offsets.slice(1).map(n => `${String(n).padStart(10, '0')} 00000 n \n`).join('');
  pdf += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf);
}

const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3002';
async function upload(data, filename = 'sample.pdf', type = 'application/pdf', field = 'file') {
  const form = new FormData();
  if (data !== null) form.append(field, new Blob([data], { type }), filename);
  return fetch(`${base}/api/upload`, { method: 'POST', body: form });
}
async function expectError(response, status) {
  assert.equal(response.status, status);
  assert.equal(typeof (await response.json()).error, 'string');
}
async function main() {
  const expected = 'PDF upload extraction test';
  const response = await upload(makePdf(expected));
  const body = await response.json();
  assert.equal(response.status, 200, JSON.stringify(body));
  assert.equal(body.filename, 'sample.pdf');
  assert.equal(body.pageCount, 1);
  assert.equal(body.text, process.env.VERCEL ? undefined : expected);
  assert.equal(body.textLength, expected.length);
  assert.equal(body.chunkCount, 1);
  assert.ok(Number.isInteger(body.documentId));
  assert.deepEqual(body.embeddings, { count: 1, model: 'Xenova/all-MiniLM-L6-v2', dimensions: 384 });
  if (!process.env.VERCEL) {
  assert.equal(body.chunks[0].embedding, undefined);
  assert.equal(body.chunks[0].embeddingDimensions, 384);
  assert.equal(body.chunks[0].text, expected);
  assert.ok(body.chunks[0].tokenCount <= 500);
  } else {
    assert.equal(body.chunks,undefined);
    assert.ok(JSON.stringify(body).length<1000);
  }
  console.log('PASS real PDF multipart extraction:', body);
  const blank = await upload(makePdf(''));
  const blankBody = await blank.json();
  assert.equal(blank.status, 200);
  assert.equal(blankBody.textLength, 0);
  assert.ok(blankBody.warning);
  if (!process.env.VERCEL) assert.deepEqual(blankBody.chunks, []);
  assert.equal(blankBody.chunkCount, 0);
  assert.equal(blankBody.embeddings.count, 0);
  const longResponse = await upload(makePdf(' hello'.repeat(1100)));
  const longBody = await longResponse.json();
  assert.equal(longResponse.status, 200);
  assert.ok(longBody.chunkCount > 1);
  assert.ok(Number.isInteger(longBody.documentId));
  assert.notEqual(longBody.documentId, body.documentId);
  assert.equal(longBody.embeddings.count, longBody.chunkCount);
  for (const [i, chunk] of (longBody.chunks || []).entries()) {
    assert.equal(chunk.index, i);
    assert.equal(chunk.embedding, undefined);
    assert.equal(chunk.embeddingModel, 'Xenova/all-MiniLM-L6-v2');
    assert.equal(chunk.embeddingDimensions, 384);
    assert.ok(chunk.tokenCount <= 500);
    if (i) assert.equal(longBody.chunks[i - 1].endToken - chunk.startToken, 50);
  }
  await expectError(await upload(null), 400);
  await expectError(await upload(Buffer.alloc(0)), 400);
  await expectError(await upload('not a pdf', 'fake.pdf'), 415);
  await expectError(await upload(makePdf(expected), 'sample.txt', 'text/plain'), 415);
  await expectError(await upload('%PDF-1.4\nbroken'), 422);
  await expectError(await upload(makePdf(expected), 'sample.pdf', 'application/pdf', 'wrong'), 400);
  await expectError(await upload(Buffer.alloc(10 * 1024 * 1024 + 1)), 413);
  await expectError(await upload(Buffer.alloc(4_000_001)), 413);
  await expectError(await upload(makePdf(' hello'.repeat(46000))), 413);
  await expectError(await fetch(`${base}/api/upload`), 405);
  await expectError(await fetch(`${base}/api/upload`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }), 415);
  const home = await fetch(base);
  assert.equal(home.status, 200);
  assert.match(await home.text(), /Upload a PDF/);
  console.log('PASS blank PDF, missing/empty/invalid/oversized file, wrong field, method and content type, homepage');
}
main().catch(err => { console.error(err); process.exitCode = 1; });
