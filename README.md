# Document RAG — local models + PostgreSQL

A Next.js Pages Router application: PDF upload → pdf-parse → 500-token chunks
with approximately 50-token overlap → local MiniLM embeddings → pgvector →
document-scoped top-five cosine retrieval → local Qwen answer + source citations.
Local mode needs no inference API key. Vercel uses hosted generation while
retaining local MiniLM embeddings and reranking; see [VERCEL.md](VERCEL.md) for
the production environment and packaging setup. Your existing `.env.local` is
private and is never changed by the application.

## Start with the configured Supabase database

Use Node.js 22.3+ or 24 and run these commands from the project root:

```powershell
npm install
# Only if you do not already have .env.local:
if (!(Test-Path .env.local)) { Copy-Item .env.example .env.local }
# Edit DATABASE_URL locally, then:
npm run models:download
npm run db:generate
npm run db:migrate
npm run db:status
npm run build
npm start
```

Open http://localhost:3000. For development use `npm run dev` instead of the last
two commands. Select a PDF on the homepage, wait for indexing, then click
"Ask questions about this PDF". `/documents` lists indexed documents.

In local Qwen mode, `DATABASE_URL` is the only required environment variable. Use your Supabase
PostgreSQL connection string; a session pooler connection can be useful when the
direct IPv6 endpoint is unavailable. Keep credentials in `.env.local`, never in
`NEXT_PUBLIC_` variables. A leftover OPENAI_API_KEY is ignored and can be removed
locally. No application code sends requests to OpenAI.

## Local inference

- `@huggingface/transformers` runs quantized ONNX models on the CPU.
- Embeddings: `Xenova/all-MiniLM-L6-v2`, normalized 384-dimensional vectors.
- Evidence reranker: `Xenova/ms-marco-MiniLM-L-6-v2`, 8-bit local cross-encoder.
- Generation: `onnx-community/Qwen2.5-1.5B-Instruct`, 4-bit CPU inference, deterministic evidence-backed answers.
- `js-tiktoken` preserves the existing 500/50 document chunks. MiniLM uses a
  different tokenizer: all text is embedded in <=220 WordPiece subwindows,
  combined by token-weighted mean and normalized. Questions use the same path.
- Models download from Hugging Face on first use and are cached in `.cache/models`
  (ignored by Git). Internet is needed for download and for Supabase, not paid
  inference. Model preparation is recommended before the first upload.
- Inference requests are serialized and use at most four CPU threads to bound resource usage.

The existing PostgreSQL search still retrieves at most five document-scoped chunks.
Overlapping adjacent chunks are reconstructed with source provenance. PDF line
wraps stay inside sentences; headings and neighboring sentences preserve context.
A local cross-encoder ranks evidence within those retrieved chunks; the best eight
sentences and neighbors nominate complete paragraphs. No cosine or reranker score
is used as a refusal threshold, and no additional database chunks are fetched.

Qwen receives this focused, explicitly delimited context and the user's question.
The 6,144-token input budget includes the actual chat template; output is limited
to 160 new tokens, with deterministic generation. A separate local entailment
check verifies the draft against original evidence. Only a positive check permits
an answer. The response uses the document's own sentence or paragraph, with exact
retrieved-chunk citations; the unchecked generated draft is never displayed.
This avoids refusing supported paraphrases merely because wording differs and
removes invented wording from the returned answer. An abstention or failed check
produces the standard not-found message. These local model checks are fallible;
review the cited text, especially for complex reasoning.

### Local debugging (development only)

```powershell
npm run debug:rag -- 5 "Which metrics are proposed for ticket classification?"
npm run test:document
```

The first command accepts any existing document ID and question. The second runs
the eight-case regression fixture against the existing SIP Project Idea Draft.pdf
(document 5); it fails clearly if that document is absent or renamed. The fixture
contains expectations, not responses used by the application.

Full diagnostics are written to ignored `.cache/diagnostics` JSON files: extracted
text, chunk integrity, retrieval ranks/scores/text, selected context, exact prompt,
raw model output, entailment-check prompts/results, validation decision, final answer and citations. These files
contain your document content; keep them private. They contain no connection URLs,
credentials, environment dumps, or vectors. Debugging is disabled when NODE_ENV is
production. The chat API never accepts a debug/trace callback from a request body.

## Database and migrations

Document: id, title, filename, content, pageCount, sizeBytes, createdAt.
Chunk: id, documentId, index, text, tokenCount, startToken, endToken,
embeddingModel, embedding `vector(384) NOT NULL`.
The document foreign key cascades on delete; (documentId, index) is unique.
Document + chunks are committed in one transaction. Vectors stay server-side.
Cosine retrieval uses parameterized SQL, an explicit document filter, and LIMIT 5.

The historical 1536-dimensional migration remains unchanged so existing Prisma
migration history is valid. The new migration changes the column to vector(384)
and the model constraint. It intentionally refuses to run if chunks exist, rather
than silently corrupt or discard vectors. Re-index old documents if necessary.
Do not use `prisma db push` in place of the migrations.

For a new local database instead of Supabase, install Docker Desktop with Linux
containers, set POSTGRES_PASSWORD and a matching local DATABASE_URL from
`.env.example`, and run:

```powershell
docker compose --env-file .env.local up -d --wait
npm run db:migrate
```

The migration creates the vector extension. Managed databases must already have
pgvector available and permit extension/table creation.

## Verification

```powershell
npm test
npm run test:models
npm run build
# With an initialized real database and a running application:
npm run test:e2e
```

The normal suite uses mocked inference/database boundaries and no network.
`npm run test:models` runs the real cached MiniLM/Qwen models, with a supplied
retrieval fixture, to verify a known answer and an unsupported-question refusal.
The explicit real end-to-end suite loads `.env.local`, creates one synthetic PDF,
POSTs it to the running app, verifies database rows and 384-dimensional vectors,
asks a known-answer question and a missing-answer question, and verifies citations.
It also checks cosine ranking/isolation in a transaction that is rolled back.
The uploaded verification document is retained so it can be inspected in the UI.
Use TEST_BASE_URL to select another local port.

## Limits

This is a local, single-user development application, not a public multi-user
service: there is no authentication or user ownership model. Document isolation
is by selected document ID. Do not expose it publicly without access controls.
Answers favor quoted evidence rather than free-form synthesis. The local model may
still decline valid questions or select incomplete evidence,
particularly for synthesis, multilingual text, or complex reasoning. Verified
quotations reduce fabricated wording but cannot prove that a selected quotation
logically answers every question. It is not a guarantee of
factual correctness. Review the cited text.
PDFs must contain extractable text (no OCR); uploads are limited to 4 MB. Original
PDF binaries are not retained. Chat history is in browser memory. There is no
streaming or background job queue. Documents listing currently shows the latest
100 uploads. First model load, answering, and long-document indexing can be slow on CPU. The Qwen
ONNX weight file is approximately 1.67 GiB; prepare models before first use.
