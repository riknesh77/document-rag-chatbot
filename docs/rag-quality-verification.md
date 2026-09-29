# Real-document RAG verification

Document: SIP Project Idea Draft.pdf (ID 5), five pages, three stored chunks.
Chunk indexes in this report are zero-based.

## Diagnosis

- Stored extracted text contains all six expected answers, with ordinary PDF line wraps and headings. Original PDF binaries are not retained, so extraction was assessed from the stored text rather than re-parsing the original file.
- Recomputing 500/50 chunking reproduced all three stored chunks exactly (500, 500 and 160 tokens; starts 0, 450, 900).
- Stored embedding norms are approximately 1. Recomputed MiniLM embeddings have cosine similarity approximately 1 to all stored vectors.
- The unchanged SQL uses document/model filters, ascending cosine distance, parameter binding, and LIMIT 5. All relevant chunks were retrieved for all six answerable questions.
- The original post-retrieval sentence splitter treated PDF line wraps as sentence boundaries. Excerpt selection omitted neighboring facts and accepted incomplete spans. Its 480-token context budget constrained evidence further.
- FLAN-T5-small often returned source labels instead of answers. Literal whole-answer matching rejected valid paraphrases. The old similarity cutoffs were not calibrated answerability measures.
- Baseline: 3/8 overall, only 1/6 answerable. The two absent-question passes resulted from rejecting meaningless model output, not a demonstrated answerability decision.

## Baseline raw output

1. Approximately how many historical ServiceDesk tickets may be available for analysis?
   - Raw output: 3,000+
   - Result: PASS

2. Which metrics are proposed for evaluating the IT ticket classification models?
   - Raw output: [1]
   - Result: FAIL

3. What does the feasibility of the predictive maintenance project depend on?
   - Raw output: the availability of sufficient historical
   - Result: FAIL

4. Will the maintenance prototype cover every machine from the beginning, or start with a narrower scope?
   - Raw output: start with a narrower scope
   - Result: FAIL

5. How will employee and company privacy be protected before ticket analysis?
   - Raw output: [1]
   - Result: FAIL

6. Why is the IT service desk project considered feasible, and what conditions must be met to use its data?
   - Raw output: [1]
   - Result: FAIL

7. What is the approved budget in dollars for the IT service desk project?
   - Raw output: [1]
   - Result: PASS

8. What exact calendar date is the predictive maintenance system scheduled to go live?
   - Raw output: [1]
   - Result: PASS



## Final architecture and live results

Generation: onnx-community/Qwen2.5-1.5B-Instruct (q4 CPU). Evidence reranking: Xenova/ms-marco-MiniLM-L-6-v2 (q8 CPU). Existing MiniLM embeddings and pgvector SQL are unchanged. No paid API is used.

Overlapping retrieved chunks are reconstructed with provenance. Whole sentences, headings and neighboring paragraph context are preserved. The local reranker selects evidence only within the retrieved top five. Qwen drafts an answer; a separate local entailment check must support it before original document wording is returned. The generated draft itself is never returned unchecked. There is no cosine-score refusal cutoff.

Final score: **8/8**, including **6/6 answerable** and **2/2 absent-answer** questions. The table below uses zero-based chunk indexes and one-based retrieval ranks.

### 1. Approximately how many historical ServiceDesk tickets may be available for analysis?

- Kind: direct
- Expected: Approximately 3,000+ tickets
- Answer-containing chunk(s): 1
- Top retrieval: #1 chunk 1: 0.5062; #2 chunk 2: 0.4085; #3 chunk 0: 0.2586
- Retrieval: PASS
- Raw draft: 3,000+
- Final answer: Approximately 3,000+ historical ServiceDesk tickets may be available for analysis.
- Citation chunk indexes: 1
- Result: **PASS**
- Time: 18.1 seconds; prompt: 337 tokens

### 2. Which metrics are proposed for evaluating the IT ticket classification models?

- Kind: direct
- Expected: Precision, recall and F1-score
- Answer-containing chunk(s): 1, 2
- Top retrieval: #1 chunk 1: 0.5784; #2 chunk 2: 0.5299; #3 chunk 0: 0.2860
- Retrieval: PASS
- Raw draft: Precision, recall, and F1-score
- Final answer: Compare models using suitable metrics such as precision, recall and F1-score.
- Citation chunk indexes: 1, 2
- Result: **PASS**
- Time: 10.3 seconds; prompt: 353 tokens

### 3. What does the feasibility of the predictive maintenance project depend on?

- Kind: direct
- Expected: Sufficient historical machine data and corresponding breakdown/maintenance records
- Answer-containing chunk(s): 1
- Top retrieval: #1 chunk 0: 0.5672; #2 chunk 2: 0.3610; #3 chunk 1: 0.3582
- Retrieval: PASS
- Raw draft: The feasibility of the predictive maintenance project depends on the availability of sufficient historical machine data and corresponding breakdown/maintenance records.
- Final answer: The feasibility of this project depends mainly on the availability of sufficient historical machine data and corresponding breakdown/maintenance records.
- Citation chunk indexes: 0, 1
- Result: **PASS**
- Time: 14.7 seconds; prompt: 366 tokens

### 4. Will the maintenance prototype cover every machine from the beginning, or start with a narrower scope?

- Kind: paraphrase
- Expected: Initially one suitable machine or machine type with sufficient historical data
- Answer-containing chunk(s): 0
- Top retrieval: #1 chunk 0: 0.3968; #2 chunk 1: 0.2218; #3 chunk 2: 0.2091
- Retrieval: PASS
- Raw draft: start with a narrower scope
- Final answer: Develop a machine-learning-based predictive maintenance system that analyzes historical machine operational data to identify abnormal behaviour and estimate the risk of machine failure. The project would initially focus on one suitable machine or machine type where sufficient historical data is available.
- Citation chunk indexes: 0
- Result: **PASS**
- Time: 16.0 seconds; prompt: 290 tokens

### 5. How will employee and company privacy be protected before ticket analysis?

- Kind: paraphrase
- Expected: Sensitive information removed or anonymized
- Answer-containing chunk(s): 1
- Top retrieval: #1 chunk 1: 0.4354; #2 chunk 2: 0.3837; #3 chunk 0: 0.1754
- Retrieval: PASS
- Raw draft: Sensitive employee or company information would be removed or anonymized before analysis.
- Final answer: Sensitive employee or company information would be removed or anonymized before analysis.
- Citation chunk indexes: 1
- Result: **PASS**
- Time: 11.3 seconds; prompt: 323 tokens

### 6. Why is the IT service desk project considered feasible, and what conditions must be met to use its data?

- Kind: multi-sentence
- Expected: Historical ServiceDesk data already available; approval and anonymization required
- Answer-containing chunk(s): 2
- Top retrieval: #1 chunk 2: 0.5777; #2 chunk 0: 0.4251; #3 chunk 1: 0.4228
- Retrieval: PASS
- Raw draft: The IT service desk project is considered feasible due to the availability of historical ServiceDesk data. To use this data, there must be approval to use it and appropriate anonymization of sensitive information.
- Final answer: This project has relatively high feasibility because historical ServiceDesk data is already available. The main requirements would be approval to use the data and appropriate anonymization of sensitive information.
- Citation chunk indexes: 2
- Result: **PASS**
- Time: 16.1 seconds; prompt: 267 tokens

### 7. What is the approved budget in dollars for the IT service desk project?

- Kind: unanswerable
- Expected: Not found
- Answer-containing chunk(s): None (answer absent)
- Top retrieval: #1 chunk 2: 0.3663; #2 chunk 1: 0.2548; #3 chunk 0: 0.2261
- Retrieval: PASS (not applicable to absence; no answer-containing chunk exists)
- Raw draft: NOT_FOUND
- Final answer: I could not find the answer in the uploaded document.
- Citation chunk indexes: None
- Result: **PASS**
- Time: 5.9 seconds; prompt: 312 tokens

### 8. What exact calendar date is the predictive maintenance system scheduled to go live?

- Kind: unanswerable
- Expected: Not found
- Answer-containing chunk(s): None (answer absent)
- Top retrieval: #1 chunk 0: 0.4345; #2 chunk 1: 0.3627; #3 chunk 2: 0.3151
- Retrieval: PASS (not applicable to absence; no answer-containing chunk exists)
- Raw draft: NOT_FOUND
- Final answer: I could not find the answer in the uploaded document.
- Citation chunk indexes: None
- Result: **PASS**
- Time: 5.9 seconds; prompt: 269 tokens

## Resources, diagnostics and limitations

Measured on this Windows machine (12 logical CPUs, 32 GiB RAM), using at most four inference threads: 5.9–18.1 seconds per question, including database retrieval and evidence verification. Peak sampled process resident memory: 3.97 GiB. The Qwen weight file is approximately 1.67 GiB. First-use downloads and startup are additional.

Run `npm run debug:rag -- 5 "your question"` for a private development trace. Full final trace: `.cache/diagnostics/document-5-1790346728306.json`. This includes stored extracted text, chunk integrity, actual retrieval scores/text, exact prompts, raw outputs, support checks and final answers. These local files contain document content and must be kept private. Debugging is disabled in production; normal API responses never contain traces or configuration.

The evaluation demonstrates improvement on this uploaded document, not universal QA accuracy. Answers intentionally favor original evidence over free-form prose. Local entailment checks can still make mistakes; complex synthesis across unrelated paragraphs, ambiguous questions, tables and multilingual documents need broader evaluation. PDF extraction still requires text PDFs; there is no OCR, and original PDF binaries are not retained. No UI, database schema, persistence, chunking or embedding implementation was changed.
