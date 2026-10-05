# BriefProof: three-minute live demo

## Prepare
- Open the production homepage and confirm service availability before presenting.
- Use **Explore a private demo → Open a private demo**. Each visitor gets an isolated sample project and a 24-hour browser session.
- The sample checklist is preloaded and explicitly labeled. Do not present it as a freshly generated AI result.
- Keep a short copy of the sample brief from `lib/demo.js` ready for live extraction. Prepare a second brief in advance as a fallback for provider delays.

## 0:00–0:25 — Problem and audience
“When a team gets a project brief, important commitments are buried in paragraphs. BriefProof helps student teams and small agencies deliver what the brief actually asks for.” Show the homepage value proposition.

## 0:25–0:45 — Enter a private workspace
Open the demo. Point out the overview and private sample brief. “No shared credentials; each demo is its own database-backed workspace. Regular users can create an email/password account.”

## 0:45–1:25 — Generate a real AI checklist
Paste the short sample into a new brief titled “My Campus Repair Pilot.” Save it and click **Generate AI checklist**. “Groq identifies explicit commitments. The server rejects invented quotes and stores the valid requirements.” While it runs, describe the feature/constraint/deliverable/success categories.

## 1:25–2:00 — Review evidence and save progress
Expand **View original evidence** on a requirement. Compare it with the original brief. Mark one item complete, refresh, and show the saved state. “An AI label is an interpretation. The original passage stays beside the work.”

## 2:00–2:35 — Verify a detail
Click **Ask source questions**. Ask “What is the pilot budget?” Show the answer and source passage. “Our existing retrieval pipeline uses MiniLM embeddings and pgvector, then checks the generated answer against original evidence. Questions and results persist too.” If a cold start or provider delay occurs, show a previously saved answer and describe it accurately.

## 2:35–3:00 — Close with value
Export the checklist. “We turn one-off document reading into a delivery workflow. The next step is a small pilot measuring time to a reviewed checklist and the requirements human reviewers find missing.” Show the repository and public product URLs.

## Do not claim
- No fabricated user numbers, revenue, accuracy scores or pilot results.
- Completion is user-reported progress, not automatic verification of implemented work.
- There is no email verification, password recovery, OCR, team sharing or billing in this MVP.
