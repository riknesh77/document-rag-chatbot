# Vercel configuration (not deployed)

The UI, database schema, chunking, 384D embeddings, scoped top-five cosine
retrieval, MiniLM reranker, evidence validation and citations are retained.
Only the generation provider changes on Vercel. Local Qwen remains available
with `GENERATION_PROVIDER=local` outside Vercel.

## Project settings

- Framework: Next.js; Node.js: **24.x**; enable **Fluid compute**.
- Install/build commands are in `vercel.json`. Installation skips ONNX CUDA
  downloads; inference uses the included Linux x64 CPU runtime.
- Build runs model preparation, Prisma generation, Next production build and a
  function trace size/private-file check. No database migrations run in builds.
- Both expensive Pages API routes use Node.js and `maxDuration: 300`.
- Set a function region near your Supabase database in Vercel settings.

Add these **server-side** variables to the intended Vercel environments:

| Name | Configuration |
| --- | --- |
| `DATABASE_URL` | Your existing Supabase PostgreSQL connection string; use its pooler for serverless connections. Do not put it in a source file. |
| `GENERATION_PROVIDER` | `groq` |
| `GROQ_API_KEY` | Your Groq project key, entered privately in Vercel settings. |
| `GENERATION_MODEL` | `openai/gpt-oss-20b` by default. Confirm availability/quota for your account; any replacement must support at least 32K context and the chat-completions API. |

Vercel supplies `VERCEL` automatically. `POSTGRES_PASSWORD` is only for the
optional local database; `OPENAI_API_KEY` is not used. Do not upload `.env.local`.
Prisma reads `process.env.DATABASE_URL` at runtime; a local environment file is
not needed in production. Review Supabase's pooler settings and connection
budget for your project before increasing traffic. No schema changes needed.

## Models and packaging

`scripts/vercel-models.json` pins revisions and SHA-256 checksums of the two
existing MiniLM models. The build downloads about **45.3 MiB combined** into
`server-models/`, outside `public/`. Runtime loads these packaged read-only files
with remote fetching and filesystem caching disabled. Neither Qwen weights nor
the development `.cache/` directory is packaged. An absent model fails closed.
The first invocation loads ONNX sessions into memory; warm requests reuse them.
No persistent writable filesystem is needed. PDFs are processed in memory.

The build trace explicitly includes platform-native ONNX and Sharp libraries
and excludes unused Prisma WASM engines. `scripts/check-vercel-package.cjs`
checks both expensive route traces plus Next's server trace and reserves space
below the standard Vercel package ceiling. Actual Linux Vercel artifact size and
cold-start latency must still be checked on the first authorized preview.

## Hosted generation and grounding

`lib/generator.js` sends server-side HTTPS chat-completion requests to Groq with
timeouts and bounded output. It never forwards provider error bodies, reasoning,
or credentials. No new SDK is needed. GPT-OSS is an open-weight model hosted by
Groq; this does **not** use the OpenAI API or an OpenAI key. Provider quota and
pricing depend on your account; free/unlimited inference is not guaranteed.

The existing draft → evidence verification → original document wording and
citations flow remains in `lib/rag.js`. Both draft and verification use the
selected provider. Unsupported drafts return the existing not-found answer.
Only the question and selected evidence passages are sent to Groq, not the PDF
file or database credentials. Hosted prompt budgeting uses cl100k as an estimate
with a separate 30,000 UTF-8-byte ceiling; no Qwen tokenizer/model is loaded.
Production request bodies cannot enable debug traces.

## Bounds and verification

- Maximum PDF: **4,000,000 bytes**, with room for multipart overhead under
  Vercel's 4.5 MB payload limit. Client and API agree on the limit.
- Maximum ingestion: **100 chunks** (roughly 45,000 tokens); larger documents
  must be split. This bounds synchronous serverless CPU work. Runtime limits can
  still depend on PDF complexity and concurrent load.
- On Vercel the upload response returns document/embedding metadata without
  duplicating the full extracted text and chunk text. The existing UI uses this
  metadata. Development extraction diagnostics remain available locally.
- Hosted calls timeout after at most 30 seconds each; an answer has a shared
  240-second inference deadline below the 300-second function limit.

```text
npm ci --include=dev --onnxruntime-node-install=skip
npm test
npm run models:vercel
npm run build
```

For a Vercel-mode local build, set `VERCEL=1` and `GENERATION_PROVIDER=groq` in
the shell before `npm run build`. A key is not required at build time. For local
Qwen development, leave `VERCEL` unset and use `npm run models:download` and
`npm run dev` as before. Do not copy `GENERATION_PROVIDER=local` to Vercel.

Before declaring the hosted app verified: configure a valid Groq key, run an
authorized Vercel preview and test one upload, one supported question with
citations and one absent-answer question. Linux-native execution cannot be
fully verified by a Windows build. This repository still has no per-user
authentication or durable rate limiting; use non-sensitive evaluation PDFs and
Vercel access/rate controls appropriate to the university evaluation.

References: [Vercel limits](https://vercel.com/docs/functions/limitations),
[Groq models](https://console.groq.com/docs/models),
[Groq API compatibility](https://console.groq.com/docs/openai).
