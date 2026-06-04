# MedLens

MedLens is a retrieval-augmented generation (RAG) clinical triage support system. It processes natural language descriptions of patient symptoms, retrieves matches from an NHS-grounded clinical knowledge base, performs differential diagnosis, and evaluates safety parameters including drug-drug interactions and user allergies.

## Core Characteristics

* **Evidence-Based Grounding**: Restricts diagnostic reasoning and triage categorization to verified medical guidelines sourced from NHS documents.
* **Agentic LangGraph Workflow**: Sequences the execution pipeline through an intake formatter, a retrieval and LLM reasoning engine, and a safety validation gate.
* **Safety Integration**: Identifies potential drug conflicts, cross-referencing recommended remedies against patient-provided active medications and known allergens.

## System Features

### Diagnostic Workspace
* Interactive UI panels for symptom entry alongside patient grounding parameters.
* Real-time status tracker charting multi-agent execution steps.
* Segmented clinical evidence views showing details of matches in the knowledge base.
* Expandable triage outcome cards presenting recommended self-care treatments.

### Dynamic Follow-Up Explorer
* Dynamic generation of highly specific subsequent user questions based on the retrieved diagnoses.
* Workspace-to-Chat context persistence mapping demographics, symptoms, and diagnoses directly into the conversational interface.

### Chat Assistant
* Natural language conversational interface grounded in workspace context.
* Integrated result visualization displaying confidence metrics.

### System Performance Metrics Dashboard
* Staggered historical MRR progression records.
* System evaluation benchmarks detailing neurological, respiratory, and cardiovascular retrieval accuracy.
