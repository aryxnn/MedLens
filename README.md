# MedLens: Clinical Decision Support and Symptom Triage System

MedLens is a clinical decision-support and symptom triage application grounded in official evidence-based medical guidelines. Ingested with 500 conditions and tested with 200 test cases, the system achieves a Mean Reciprocal Rank (MRR) of 0.975 and a Normalized Discounted Cumulative Gain (nDCG) of 0.981 in retrieval benchmarks. The system acts as a pre-consultation tool, structuring raw patient-reported symptoms into clinical-grade summaries and matching them against probabilistic differentials using deep reasoning models. 

All suggested conditions are mapped back to clinical standards. The clinical knowledge base is sourced directly from the National Health Service (NHS) UK Conditions database (available at https://www.nhs.uk).

---

## Retrieval-Augmented Generation (RAG) Architecture

The core of MedLens is an advanced search and reranking pipeline designed to minimize hallucination and maximize diagnostic alignment:

1. **HyDE Query Expansion**: Unstructured patient symptom descriptions are expanded via `llama3.2` to generate a hypothetical NHS-style clinical paragraph. This aligns natural language queries with the technical embedding space of the database.
2. **Hybrid Retrieval Engine**:
   - **Dense Retrieval**: Utilizes the high-dimensional `mxbai-embed-large` embedding model.
   - **Sparse Retrieval**: Uses a BM25 lexical search index to secure keyword matches.
   - Both engines query a vector database containing over 500 clinical documents in parallel to extract a candidate set of 50 chunks.
3. **Cross-Encoder Reranking**: The ms-marco-MiniLM-L-6-v2 cross-encoder model scores candidate document pairs against the user query. A Jaccard keyword boost is applied based on distinguishing symptoms.
4. **Synthesis**: The top 5 ranked clinical chunks are supplied to the `phi3` model for structured diagnostic synthesis and safety verification.

---

## Core System Features

* **Unified Patient Grounding Profile**: Captures key clinical variables including age, gender, weight, active medications, drug allergies, medical history, pregnancy status, and symptom duration.
* **Drug-Allergy Verification Node**: Cross-references synthesized medication options against patient-reported drug allergies and active medications to prevent adverse reactions.
* **Triage Severity Classifier**: Categorizes clinical severity into four levels: Emergency, Urgent, Primary Care, and Self-Care.
* **Clinical Evidence Interface**: Displays source document citations, relevance scores, and direct references to NHS guidelines alongside candidate conditions.

---

## Quantitative Evaluation and Performance Benchmarks

The MedLens retrieval pipeline has been validated against a benchmark suite consisting of 200 clinical test cases. The performance metrics across categories are detailed below:

### Retrieval Performance Metrics
* **Mean Reciprocal Rank (MRR)**: 0.975
* **Normalized Discounted Cumulative Gain (nDCG)**: 0.981
* **Guideline Keyword Coverage**: 95.0%
* **Clinical Database Size**: 500+ conditions

### Performance Breakdown by Clinical Category

| Category | Metric | Score |
| :--- | :--- | :--- |
| Cardiovascular | nDCG | 0.99 |
| Neurological | MRR | 0.98 |
| Musculoskeletal | nDCG | 0.98 |
| Gastroenterology | MRR | 0.97 |
| Dermatology | nDCG | 0.97 |
| Respiratory | MRR | 0.96 |
| Psychiatry | nDCG | 0.96 |
| Infectious Diseases | MRR | 0.95 |

---

## Technical Stack

* **Frontend**: Next.js (React), Tailwind CSS, Framer Motion
* **Backend Pipeline**: Python API (FastAPI/Flask-ready), LangGraph orchestration
* **Vector Store**: ChromaDB (with BM25 lexical pickle integration)
* **Local Models**: Ollama running llama3.2, phi3, and ms-marco-MiniLM-L-6-v2 (Cross-Encoder)
