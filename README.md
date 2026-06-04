# MedLens - AI-Powered Clinical Support and Symptom Analysis Platform

MedLens is a full-stack, enterprise-grade clinical decision support and preliminary diagnostic suggestion system. The platform enables users to securely log and track physiological vitals, record detailed symptom progressions, and generate structured diagnostic evaluations powered by advanced reasoning language models.

This system acts as a pre-consultation tool, structuring raw patient-reported symptoms into clinical-grade summaries and matching them against probabilistic differentials using deep reasoning models. All suggested conditions are mapped back to clinical standards, encouraging users to verify symptoms against trusted resources such as the official National Health Service website: https://www.nhs.uk.

---

## Architectural Overview

The application utilizes a decoupled, three-tier architecture designed for scalability, security, and extensibility:

1. **Client Tier (Frontend)**: A single-page application built on React.js. It features a responsive grid interface designed with CSS and Bootstrap for high accessibility, Axios-based dynamic HTTP client routing, and secure local session state management.
2. **Server Tier (Backend)**: An asynchronous REST API built using Node.js and Express.js. It handles request validation, authentication middleware, error mitigation, security headers, and AI proxy routing.
3. **Database Tier (Persistence)**: A MongoDB database accessed via the Mongoose Object Data Modeling library. It manages data models for user accounts, patient historical states, and generated diagnostic profiles.
4. **AI Orchestration Layer**: A secure, server-side gateway that interfaces with high-reasoning language models (such as DeepSeek-R1 via the OpenRouter API) to generate highly structured JSON clinical profiles.

---


## Top Conditions Evaluated by MedLens

MedLens processes acute symptom profiles to flag potential conditions. The system matches patient inputs against critical patterns to suggest possible differentials:

1. **Viral Respiratory Infections**: Common Cold, Influenza, Acute Bronchitis, and Pharyngitis.
2. **Gastrointestinal Disorders**: Acute Gastroenteritis, Gastroesophageal Reflux Disease (GERD), and Irritable Bowel Syndrome (IBS).
3. **Musculoskeletal and Neurological Issues**: Tension Headaches, Migraines, and Acute Muscle Strain.
4. **Allergic and Immunological Reactions**: Allergic Rhinitis, Contact Dermatitis, and Acute Urticaria.
5. **Metabolic and Endocrine Conditions**: Dehydration patterns, pre-diabetic glycemic fluctuations, and thermal regulation issues.

For official verification, safety guidelines, and treatment support for any of these conditions, patients are advised to consult the National Health Service website: https://www.nhs.uk.

---

