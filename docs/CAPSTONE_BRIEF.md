# BriefProof — scope clarity, backed by evidence

## Problem
Project teams lose explicit requirements inside assignment rubrics, client scopes and PDF briefs. A generic chat can answer a question, but it does not create a durable delivery checklist with evidence and progress.

## Target User
Student capstone teams, small agencies and independent project builders who need to turn a short brief into trackable commitments.

## Core Feature
Save a text brief or upload a PDF. Generate a checklist grouped into features, deliverables, constraints and success metrics. Read the original quote for every item, mark work complete, refresh to verify persistence and export a Markdown checklist.

## AI Component
Groq extracts candidate requirements from untrusted source content. The server accepts only bounded items with recognized categories and exact contiguous quotes present in the original document. The existing MiniLM embeddings, pgvector retrieval, cross-encoder ranking and Groq evidence verification support source questions. AI labels remain interpretations; original sources are visible for human review.

## Success Metric
Pilot target, not a measured claim: a new user produces and reviews a source-backed checklist from a short brief within three minutes. Measure accepted requirements, missed requirements found by human review, time to first checklist and progress revisits across a small student-team pilot.

## Originality
BriefProof focuses on brief-to-delivery traceability: explicit scope becomes persisted checklist items with verbatim evidence and completion status. Document questions support that workflow rather than being the entire product.

## Capstone status
The repository preserves the existing Document RAG history and infrastructure. Functional signup is tested using isolated test accounts; a real first customer and industry panel review must be achieved outside automated engineering verification.
