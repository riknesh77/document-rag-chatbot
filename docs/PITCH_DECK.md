# BriefProof — seven-slide pitch

## 1. Problem: the brief gets read, then forgotten
**Headline:** A buried requirement becomes a missed deliverable.
- Assignment rubrics and client scopes scatter requirements across paragraphs.
- Generic chat responses are hard to turn into lasting delivery commitments.
- Teams need to see both what to deliver and where the expectation came from.
**Visual:** Original brief alongside a missed checklist item.
**Speaker note:** Describe a familiar student-team experience; do not invent research statistics.

## 2. Target users: teams with a short brief and a real deadline
- Student capstone teams and independent project builders.
- Small agencies reviewing client scopes.
- First pilot: a few student teams with real project briefs.
**Visual:** Brief → team → deliverables.
**Speaker note:** This is a focused initial audience, not a claim of existing customers.

## 3. Solution: BriefProof
**Headline:** Deliver what the brief actually asks for.
- Save a brief or upload a PDF.
- Generate actionable commitments with original evidence.
- Review, track and export the checklist.
**Visual:** Product screenshot of the brief review page.

## 4. Product workflow: from brief to done
1. Create a private account or enter an isolated demo.
2. Save a project brief.
3. Generate the AI checklist.
4. Expand an exact source quote and review its interpretation.
5. Mark progress, refresh, ask a source question, export.
**Visual:** Live three-minute demonstration.
**Speaker note:** The sample checklist is preloaded; use a newly saved brief to demonstrate live AI.

## 5. AI and architecture: trust starts with traceability
- Next.js Pages Router and React preserve the existing application.
- Prisma + PostgreSQL store users, sessions, briefs, requirements and answers.
- Groq extracts requirements; quote validation filters unsupported citations.
- MiniLM embeddings + pgvector + reranking support source questions.
- Random opaque sessions, salted scrypt passwords, server ownership checks and server-only database access protect workspaces.
**Visual:** Architecture diagram in README.
**Speaker note:** Quotes are checked exactly; completeness and interpretation still require human review.

## 6. Value and business hypothesis
- Less time manually converting project scopes into checklists.
- A source-linked review trail when scope is disputed.
- Durable progress instead of an ephemeral chat response.
- Hypothesis: free individual use, with future paid team workspaces and scope revision history.
**Pilot measures:** Time to first reviewed checklist, missing requirements discovered by reviewers, repeat progress updates.
**Speaker note:** Billing is not implemented. Pricing and willingness to pay need validation.

## 7. Roadmap and ask
**Now:** Private signup, source-backed checklists, PDF ingestion, saved progress, evidence questions and export.
**Next:** Email verification/recovery, brief version comparison, reviewer edits and shared team workspaces.
**Later:** Integrations, billing and evaluation against a labeled brief dataset.
**Ask:** Recruit student teams for a small pilot and collect reviewer feedback on extraction completeness.
**Close:** BriefProof — know the scope, prove the delivery.
