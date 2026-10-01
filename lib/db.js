const { PrismaClient, Prisma } = require('@prisma/client');

class PersistenceError extends Error {
  constructor(message = 'Could not save the document. Check database connectivity and migrations.', status = 503) {
    super(message);
    this.name = 'PersistenceError';
    this.status = status;
  }
}
function logDbError(context, err) {
  const message = String(err?.message || '').replace(/postgres(?:ql)?:\/\/\S+/gi, '[redacted-url]');
  console.error('[db]', context, { name: err?.name, code: err?.code, message });
}
function getDb() {
  if (typeof window !== 'undefined') throw new Error('Database access is server-only.');
  if (!process.env.DATABASE_URL?.trim()) throw new PersistenceError('Configure DATABASE_URL in the server environment and initialize the database.');
  if (!globalThis.documentRagPrisma) globalThis.documentRagPrisma = new PrismaClient();
  return globalThis.documentRagPrisma;
}

async function saveDocument({ filename, text, pageCount, sizeBytes, chunks }, { db } = {}) {
  // Validate before opening a transaction. The SQL migration enforces these too.
  const validInt = n => Number.isInteger(n) && n >= 0;
  if (typeof filename !== 'string' || !filename.trim() || typeof text !== 'string' ||
      !validInt(pageCount) || !validInt(sizeBytes) || !Array.isArray(chunks) ||
      chunks.some((c, i) => c.index !== i || typeof c.text !== 'string' || !c.text.trim() ||
        !Number.isInteger(c.tokenCount) || c.tokenCount < 1 || c.tokenCount > 500 ||
        !validInt(c.startToken) || !validInt(c.endToken) || c.endToken <= c.startToken ||
        c.embeddingModel !== 'Xenova/all-MiniLM-L6-v2' || !Array.isArray(c.embedding) ||
        c.embedding.length !== 384 || !c.embedding.every(n => Number.isFinite(n) && Number.isFinite(Math.fround(n))))) {
    throw new PersistenceError('Invalid document or chunk data; nothing was saved.', 500);
  }
  try {
    const client = db || getDb();
    return await client.$transaction(async tx => {
      const document = await tx.document.create({data: {title: filename, filename, content: text, pageCount, sizeBytes}});
      // Prisma does not natively write Unsupported vector fields. Use bound SQL
      // parameters with an explicit vector cast, never string-interpolated SQL.
      for (let offset = 0; offset < chunks.length; offset += 64) {
        const rows = chunks.slice(offset, offset + 64).map(c => Prisma.sql`(${document.id}, ${c.index}, ${c.text}, ${c.tokenCount}, ${c.startToken}, ${c.endToken}, ${c.embeddingModel}, ${JSON.stringify(c.embedding)}::vector(384))`);
        await tx.$executeRaw(Prisma.sql`INSERT INTO "Chunk" ("documentId", "index", "text", "tokenCount", "startToken", "endToken", "embeddingModel", "embedding") VALUES ${Prisma.join(rows)}`);
      }
      return { documentId: document.id, filename: document.filename, chunkCount: chunks.length };
    }, { maxWait: 10000, timeout: 60000 });
  } catch (err) {
    if (err instanceof PersistenceError) throw err;
    logDbError('saveDocument', err);
    // Database errors can include URLs or document text; never forward them.
    throw new PersistenceError();
  }
}
module.exports = { saveDocument, PersistenceError, getDb, logDbError };
