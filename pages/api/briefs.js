import { getDb, saveDocument } from '../../lib/db';
import { requireUser, checkOrigin, rateLimit, HttpError, apiError } from '../../lib/auth';
import { extractRequirements } from '../../lib/requirements';
import { chunkText } from '../../lib/chunker';
import { embedChunks } from '../../lib/embedder';
export const config = { runtime: 'nodejs', maxDuration: 300, api: { bodyParser: { sizeLimit: '64kb' } } };
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const user = await requireUser(req);
    const db = getDb();
    if (req.method === 'GET') {
      const id = Number(req.query.id);
      if (!Number.isSafeInteger(id) || id < 1) throw new HttpError(400, 'Choose a valid brief.');
      const document = await db.document.findFirst({ where: { id, ownerId: user.id }, include: { requirements: { orderBy: { createdAt: 'asc' } }, answers: { orderBy: { createdAt: 'asc' }, take: 50 } } });
      if (!document) throw new HttpError(404, 'Brief not found.');
      return res.json({ document });
    }
    if (!['POST', 'PATCH'].includes(req.method)) { res.setHeader('Allow', 'GET, POST, PATCH'); return res.status(405).json({ error: 'Use GET, POST or PATCH.' }); }
    checkOrigin(req);
    const { action, documentId, title, content, requirementId, done } = req.body || {};
    if (req.method === 'POST' && action === 'create') {
      if (typeof title !== 'string' || !title.trim() || title.length > 120 || typeof content !== 'string' || content.trim().length < 50 || content.length > 22000) throw new HttpError(400, 'Enter a title and a brief of 50–22,000 characters.');
      await rateLimit(req, `create-${user.id}`, 10);
      if (await db.document.count({ where: { ownerId: user.id } }) >= 30) throw new HttpError(409, 'This workspace supports up to 30 briefs.');
      const document = await db.document.create({ data: { title: title.trim(), filename: title.trim() + '.txt', content: content.trim(), pageCount: 1, sizeBytes: Buffer.byteLength(content), ownerId: user.id } });
      return res.status(201).json({ documentId: document.id });
    }
    if (!Number.isSafeInteger(documentId) || documentId < 1) throw new HttpError(400, 'Choose a valid brief.');
    const document = await db.document.findFirst({ where: { id: documentId, ownerId: user.id } });
    if (!document) throw new HttpError(404, 'Brief not found.');
    if (req.method === 'PATCH') {
      if (typeof requirementId !== 'string' || typeof done !== 'boolean') throw new HttpError(400, 'Choose a requirement and completion state.');
      const updated = await db.requirement.updateMany({ where: { id: requirementId, documentId }, data: { done } });
      if (!updated.count) throw new HttpError(404, 'Requirement not found.');
      return res.json({ ok: true });
    }
    if (action === 'extract') {
      await rateLimit(req, `extract-${user.id}`, 10);
      // Preserve completed work; regenerate only when no checklist exists.
      if (await db.requirement.count({ where: { documentId } })) throw new HttpError(409, 'This brief already has a checklist. Create a new brief to analyze revised scope.');
      const requirements = await extractRequirements(document.content);
      await db.$transaction(async tx => {
        // Serialize concurrent generations for this document.
        await tx.$queryRaw`SELECT id FROM "Document" WHERE id = ${documentId} FOR UPDATE`;
        if (await tx.requirement.count({ where: { documentId } })) throw new HttpError(409, 'A checklist was already generated. Refresh to see it.');
        await tx.requirement.createMany({ data: requirements.map(r => ({ ...r, documentId })) });
      });
      return res.json({ count: requirements.length });
    }
    if (action === 'index') {
      await rateLimit(req, `index-${user.id}`, 5);
      if (await db.chunk.count({ where: { documentId } })) return res.json({ documentId });
      // Reuse the existing transactional pgvector ingestion, then atomically move
      // chunks onto the existing brief so its checklist/history stay intact.
      const chunks = await embedChunks(chunkText(document.content));
      const saved = await saveDocument({ filename: document.filename, text: document.content, pageCount: document.pageCount, sizeBytes: document.sizeBytes, chunks, ownerId: user.id });
      await db.$transaction(async tx => {
        await tx.$queryRaw`SELECT id FROM "Document" WHERE id = ${documentId} FOR UPDATE`;
        if (!await tx.chunk.count({ where: { documentId } })) await tx.$executeRaw`UPDATE "Chunk" SET "documentId" = ${documentId} WHERE "documentId" = ${saved.documentId}`;
        await tx.document.delete({ where: { id: saved.documentId } });
      });
      return res.json({ documentId });
    }
    throw new HttpError(400, 'Choose a supported action.');
  } catch (error) { return apiError(res, error); }
}
