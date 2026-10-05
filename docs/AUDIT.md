# Repository audit and engineering decisions

## Starting point
The chat workspace was empty. The connected GitHub repository `riknesh77/document-rag-chatbot` matched the saved local Document RAG project and existing Vercel deployment. It was cloned with history intact; working ingestion, retrieval, models and evidence checks were preserved.

- Framework: Next.js Pages Router, React, JavaScript.
- Database: Prisma 6 + Supabase PostgreSQL + pgvector.
- AI: CPU MiniLM embeddings/reranker, local Qwen option, hosted Groq generation on Vercel.
- Existing APIs: PDF upload, document list, source-backed questions.
- Missing: authentication, account ownership, persistent answer history, requirements workflow and capstone documents.
- UI issues: on-device/private-inference claims were inaccurate for hosted generation; upload limit text and navigation needed correction.
- Validation gaps: no lint or typecheck scripts; useful ingestion/retrieval tests already existed.

## Changes
Added private accounts, revocable hashed sessions, scrypt passwords, rate limiting and request-origin checks. Added source-backed requirement extraction, saved completion and export, text briefs, persisted answers and isolated demo workspaces. Added additive migrations, including RLS with no browser-facing policies. Legacy documents stay unassigned and inaccessible through user APIs; no existing records are automatically claimed by a new account.

Patched Next.js from 16.3.4 to 16.3.8 and overrode vulnerable deepmerge-ts with v8. The dependency install audit reports zero known vulnerabilities. Prisma remains on its working version.

## Verification scope
Lint, TypeScript schema contracts/JS syntax, unit tests, mocked PDF ingestion and production build are automated. The existing JavaScript application is not converted to strict TypeScript; `checkJs` is disabled. Real API tests cover signup/login/logout, revocation, persistence, origin rejection and cross-account isolation. Browser checks cover landing, demo, completion persistence and responsive layout.

Production verification is recorded separately in `VERIFICATION.md`; do not infer deployment success from a local build.
