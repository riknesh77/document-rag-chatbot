const {Prisma} = require('@prisma/client');
const {getDb} = require('./db');
const {DIMENSIONS, MODEL} = require('./embedder');
async function search(documentId, vector, {db} = {}) {
  if (!Number.isSafeInteger(documentId) || documentId < 1) throw new Error('Invalid document ID');
  if (!Array.isArray(vector) || vector.length !== DIMENSIONS || !vector.every(Number.isFinite) || !Math.hypot(...vector)) throw new Error('Invalid query vector');
  const client = db || getDb();
  return client.$queryRaw(Prisma.sql`
    SELECT c."id", c."documentId", d."title" AS "documentTitle", c."index", c."text",
           c."tokenCount", c."startToken", c."endToken",
           1 - (c."embedding" <=> ${JSON.stringify(vector)}::vector(384)) AS "similarity"
    FROM "Chunk" c JOIN "Document" d ON d."id" = c."documentId"
    WHERE c."documentId" = ${documentId} AND c."embeddingModel" = ${MODEL}
    ORDER BY c."embedding" <=> ${JSON.stringify(vector)}::vector(384), c."index" ASC
    LIMIT 5`);
}
module.exports = {search};
