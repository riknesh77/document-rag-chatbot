const { getPipeline, withInference } = require('./localModels');
const MODEL = 'Xenova/all-MiniLM-L6-v2';
const DIMENSIONS = 384;
const BATCH_SIZE = 8;
class EmbeddingError extends Error {
  constructor() { super('Local embedding failed. Run npm run models:download and check available memory.'); this.status = 503; this.name = 'EmbeddingError'; }
}
function normalize(values) {
  if (values.length !== DIMENSIONS || !values.every(Number.isFinite)) throw new Error('Invalid vector');
  const norm = Math.hypot(...values);
  if (!norm) throw new Error('Zero vector');
  return values.map(v => v / norm);
}
async function embedTexts(texts, { extractor } = {}) {
  if (!texts.length) return [];
  try {
    return await withInference(async () => {
      const model = extractor || await getPipeline('embedding');
      const results = [];
      for (const text of texts) {
        if (typeof text !== 'string' || !text.trim()) throw new Error('Empty input');
        // cl100k chunks can exceed MiniLM's 256 WordPiece training window.
        // Encode all text in <=220 WordPiece subwindows, then mean and normalize.
        const ids = model.tokenizer.encode(text, { add_special_tokens: false });
        const windows = [];
        for (let start = 0; start < ids.length; start += 220) {
          windows.push(model.tokenizer.decode(ids.slice(start, start + 220), { skip_special_tokens: true }));
        }
        const sum = Array(DIMENSIONS).fill(0);
        for (let start = 0; start < windows.length; start += BATCH_SIZE) {
          const batch = windows.slice(start, start + BATCH_SIZE);
          const output = await model(batch, { pooling: 'mean', normalize: true });
          const vectors = output.tolist();
          if (vectors.length !== batch.length) throw new Error('Missing vectors');
          vectors.forEach((v, index) => {
            const weight = Math.min(220, ids.length - (start + index) * 220);
            normalize(v).forEach((value, i) => { sum[i] += value * weight; });
          });
        }
        results.push(normalize(sum));
      }
      return results;
    });
  } catch { throw new EmbeddingError(); }
}
async function embedChunks(chunks, options) {
  const vectors = await embedTexts(chunks.map(c => c.text), options);
  return chunks.map((chunk, i) => ({ ...chunk, embedding: vectors[i], embeddingModel: MODEL }));
}
module.exports = { embedTexts, embedChunks, normalize, EmbeddingError, MODEL, DIMENSIONS, BATCH_SIZE };
