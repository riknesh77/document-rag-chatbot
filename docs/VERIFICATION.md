# BriefProof verification

Verified locally on 5 October 2026:
- Lint passed.
- TypeScript schema contracts and JavaScript syntax passed. Existing JS is not strictly type-checked.
- 43 unit tests passed, plus multipart PDF extraction and upload edge-case checks.
- Next.js optimized production build passed.
- Real Supabase migration and schema status passed.
- Signup, login, logout, token revocation, persisted briefs, input validation and cross-account read/write/chat isolation passed against the running app and actual database.
- Browser: landing loaded without page errors, private demo opened, completion survived refresh, 390-pixel mobile review had no horizontal overflow.
- Dependency install audit reported zero known vulnerabilities after patching.

## Production: PASS

Public site: https://document-rag-chatbot-two.vercel.app

Repository: https://github.com/riknesh77/document-rag-chatbot

Verified deployed implementation commit: `c1add87aab260d48e1256c038c6847e6ea1003ef`.
Vercel deployment: `dpl_JDiWTUn7VrWtRNB2t7vPNsyJsPq8`, production, READY, public alias assigned.
Final documentation/test-only commits build the same application; their deployment status is checked separately before handoff.

The production database differs from the local database. Its existing Document/Chunk data was preserved. The production build applied the two additive workspace/security migrations atomically through the working pooled connection, without replaying the old vector conversion. Public `/api/health` reports database connectivity and all schema readiness checks true.

Actual public API and database checks passed:
- Anonymous APIs reject access; private pages redirect to sign-in.
- Signup, wrong/correct password login, logout and revoked old sessions.
- Persisted private briefs survive logout/login; invalid input and hostile origins are rejected.
- Cross-account brief reads, extraction, source questions and PDF reads are rejected.
- Real Groq extraction produces multiple requirements with exact quotes present in the brief.
- Completion updates persist; actual MiniLM indexing and pgvector retrieval succeed.
- The pilot budget answer is grounded in original source evidence and its history is saved.
- A real text PDF uploads, extracts, persists privately, indexes into 384-dimensional embeddings and produces a grounded answer with the correct opening date.
- A unique preloaded demo has seven requirements and persists completion. It is labeled as preloaded on the workspace overview.

Production browser checks passed: homepage, demo access, brief review, completion after reload, no reported page errors, and mobile width 390px equals document width (no horizontal overflow). Screenshots in `docs/screenshots/` were captured from production.

Quality checks were rerun: lint, type contracts and all 43 unit tests plus PDF extraction/error cases passed. The Vercel optimized build and deployment are READY. The seven-slide editable PowerPoint passed file-integrity/layout checks; all seven slides exported from the final PPTX were visually inspected.

Vercel build/runtime log access through the connector returned a scope authorization error. Verification therefore relies on deployment state, public readiness, real API/database workflows and browser inspection; unrestricted server-log inspection was unavailable.

Tests create accounts at `example.invalid` with random credentials kept in memory. These are engineering fixtures, not customers. Demo and test accounts require eventual maintenance; no external messages were sent.

A real first customer and industry panel review are outside automated engineering verification.
