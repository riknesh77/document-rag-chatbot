import formidable from "formidable";
import { Writable } from "node:stream";
import { PDFParse } from "pdf-parse";
import { chunkText } from "../../lib/chunker";
import { saveDocument, PersistenceError } from "../../lib/db";
import { embedChunks, EmbeddingError, MODEL, DIMENSIONS } from "../../lib/embedder";
import { MAX_PDF_BYTES, MAX_UPLOAD_BYTES, MAX_INGESTION_CHUNKS, uploadDetails } from "../../lib/uploadLimits";

export const config = { runtime: 'nodejs', maxDuration: 300, api: { bodyParser: false } };

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Use POST to upload a PDF." });
  }
  if (!/^multipart\/form-data\b/i.test(req.headers["content-type"] || "")) {
    return res.status(415).json({ error: "Send a PDF as multipart/form-data in the 'file' field." });
  }
  // Keep the bounded upload in memory; no permanent or temporary files are saved.
  if (Number(req.headers["content-length"]) > MAX_UPLOAD_BYTES) {
    return res.status(413).json({error: "The PDF must be 4 MB or smaller."});
  }
  const buffers = [];
  const form = formidable({
    maxFiles: 1,
    maxFileSize: MAX_PDF_BYTES,
    maxTotalFileSize: MAX_PDF_BYTES,
    maxFields: 0,
    allowEmptyFiles: false,
    fileWriteStreamHandler: () => new Writable({
      write(chunk, encoding, callback) {
        buffers.push(Buffer.from(chunk));
        callback();
      },
    }),
  });
  let files;
  try {
    [, files] = await form.parse(req);
  } catch (err) {
    const tooLarge = err.code === 1009 || err.code === 1016;
    return res.status(tooLarge ? 413 : 400).json({
      error: tooLarge ? "The PDF must be 4 MB or smaller." : "Provide one non-empty PDF in the 'file' field using valid multipart/form-data.",
    });
  }
  const file = files.file?.[0];
  if (!file || Object.keys(files).length !== 1) {
    return res.status(400).json({ error: "Provide one PDF in the 'file' field." });
  }
  const data = Buffer.concat(buffers);
  if (!/\.pdf$/i.test(file.originalFilename || "") ||
      !["application/pdf", "application/octet-stream"].includes(file.mimetype) ||
      data.subarray(0, 5).toString("ascii") !== "%PDF-") {
    return res.status(415).json({ error: "The uploaded file must be a PDF with a .pdf filename and valid PDF contents." });
  }
  let parser;
  try {
    parser = new PDFParse({ data: new Uint8Array(data) });
    const result = await parser.getText({ pageJoiner: "" });
    const text = result.text.trim();
    const chunks = chunkText(text);
    if (chunks.length > MAX_INGESTION_CHUNKS) return res.status(413).json({error: "This document is too long for a single upload. Split it into PDFs of at most 100 chunks (about 45,000 tokens) each."});
    const embeddedChunks = await embedChunks(chunks);
    const saved = await saveDocument({ filename: file.originalFilename, text, pageCount: result.total, sizeBytes: file.size, chunks: embeddedChunks });
    return res.status(200).json({
      documentId: saved.documentId,
      filename: file.originalFilename,
      pageCount: result.total,
      ...uploadDetails(text, embeddedChunks),
      textLength: text.length,
      // Stored vectors stay on the server.
      chunkCount: chunks.length,
      embeddings: { count: embeddedChunks.length, model: MODEL, dimensions: DIMENSIONS },
      ...(!text && { warning: "No extractable text was found. This PDF may contain scanned images; OCR is not implemented." }),
    });
  } catch (err) {
    if (err instanceof PersistenceError) return res.status(err.status).json({ error: err.message });
    if (err instanceof EmbeddingError) return res.status(err.status).json({ error: err.message });
    return res.status(422).json({
      error: err.name === "PasswordException"
        ? "This PDF is password-protected. Upload an unprotected PDF."
        : "Text extraction failed. The PDF may be damaged or unsupported. Try another PDF.",
    });
  } finally {
    if (parser) await parser.destroy().catch(() => {});
  }
}
