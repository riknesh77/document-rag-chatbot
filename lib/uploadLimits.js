// Leave multipart overhead below Vercel's 4.5 MB request ceiling.
const MAX_PDF_BYTES = 4_000_000;
const MAX_UPLOAD_BYTES = 4_100_000;
// Compressed PDFs can expand far beyond their file size. Bound CPU work before
// embedding or persistence to fit a synchronous serverless ingestion request.
const MAX_INGESTION_CHUNKS = 100;
function uploadDetails(text, embeddedChunks) {
  // The UI only needs metadata. Keep full extraction diagnostics locally.
  if (process.env.VERCEL) return {};
  return {text, chunks:embeddedChunks.map(({embedding,...chunk})=>({...chunk,embeddingDimensions:embedding.length}))};
}
module.exports = {MAX_PDF_BYTES,MAX_UPLOAD_BYTES,MAX_INGESTION_CHUNKS,uploadDetails};
