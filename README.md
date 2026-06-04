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

## Core Features

### Secure User Authentication and Session Management
* Implementation of JsonWebToken (JWT) standard for stateless user sessions.
* Secure password hashing using bcrypt on the server side prior to database persistence.
* Authentication middleware protecting downstream API routes from unauthorized access.
* Local storage token rotation and auto-logout mechanisms on credentials expiration.

### Comprehensive Clinical Intake and Vitals Form
* Enforces capture of 13 distinct patient profiling metrics: Age, Gender, Weight, Temperature, Heart Rate, Symptoms, Duration, Severity, Medical History, Current Medications, Allergies, Lifestyle Factors, and Additional Context.
* Multi-dimensional symptom tracking including description, duration, and severity index.
* Physiological vitals reporting, including Body Temperature and Heart Rate.
* Integration of persistent medical history, active daily medications, known allergies, and lifestyle indicators (e.g., exercise, diet, smoking).
* Real-time form validation preventing malformed requests or incomplete profiles from hitting processing APIs.

### Asynchronous Reasoning Differential Diagnosis Engine
* Server-side compilation of structured medical prompts utilizing incoming patient parameters.
* Direct integration with OpenRouter API to fetch responses from deep reasoning architectures (DeepSeek-R1-Free) with average response latency ranging between 5 and 15 seconds.
* Native JSON-output enforcement with parsing, sanitization, and database ingestion rules.
* Output structural integrity validation to ensure results consistently yield diagnostic possibilities, matching medical explanations, pharmacotherapeutic considerations, and clinical urgency evaluations.

### Historical Clinical Logs and Auditing
* Automatic association of generated diagnostics with authenticated user profiles.
* Chronicling of patient vitals and symptoms at the exact timestamp of analysis.
* Historical lookup dashboards that allow patients and medical assistants to review diagnostic progression over time.
* Sorted retrieval optimizations utilizing database indexing on user relations and creation timestamps.

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

## Technical Stack

### Frontend Architecture
* **Core Framework**: React.js 18
* **Styling Engine**: CSS3, Bootstrap 5 (Responsive Layouts)
* **HTTP Client**: Axios (configured with interceptors for authorization headers)
* **Build System**: Create React App (Webpack, Babel)

### Backend Services
* **Runtime**: Node.js
* **Framework**: Express.js
* **Authentication**: JsonWebToken (JWT), bcryptjs
* **API Communication**: Axios (for upstream AI platform integration)
* **Configuration**: Dotenv (environment variables management)

### Database and Data Storage
* **Engine**: MongoDB Atlas (Cloud Database)
* **ODM Layer**: Mongoose
* **Schemas**:
  * **User Schema**: Enforces unique username/email constraints, stores hashed passwords, and tracks profile metadata.
  * **Diagnosis Schema**: Models user relations, patient input states (vitals, demographics, lifestyle), structured diagnostic suggestions, pharmacological notes, and urgency status tags.

---

## Database Schemas

### User Model
Stores identity and authentication credentials:
* `username`: String (Required, Unique, Trimmed)
* `email`: String (Required, Unique, Trimmed, Lowercase)
* `password`: String (Required, Minimum length check)
* `timestamps`: Date fields tracking creation and updates

### Diagnosis Model
Maintains relational mapping and clinical inputs:
* `user`: Schema.Types.ObjectId (Reference to User model, Required)
* `patientData`:
  * `age`: Number (Required)
  * `gender`: String (Required)
  * `weight`: Number
  * `temperature`: Number
  * `heartRate`: Number
  * `symptoms`: String (Required)
  * `duration`: String (Required)
  * `severity`: String (Required)
  * `medicalHistory`: String
  * `medications`: String
  * `allergies`: String
  * `lifestyle`: String
  * `context`: String
* `diagnosis`: Array of Objects containing:
  * `condition`: String (Required)
  * `reason`: String (Required)
* `medicines`: Array of Objects containing:
  * `compound`: String
  * `for`: String
* `urgentAttention`: String (Indicates level of alert required)
* `createdAt`: Date (Automatically generated timestamp)

---

## API Documentation

### Authentication Routes

#### Register User
* **Endpoint**: `POST /api/auth/register`
* **Access**: Public
* **Payload**:
  ```json
  {
    "username": "johndoe",
    "email": "john@example.com",
    "password": "securepassword123"
  }
  ```
* **Response**: JWT access token on success.

#### Login User
* **Endpoint**: `POST /api/auth/login`
* **Access**: Public
* **Payload**:
  ```json
  {
    "email": "john@example.com",
    "password": "securepassword123"
  }
  ```
* **Response**: JWT access token on success.

---

### Diagnosis Routes

#### Process Diagnosis
* **Endpoint**: `POST /api/diagnosis/diagnose`
* **Access**: Private (Requires `x-auth-token` header)
* **Payload**:
  ```json
  {
    "age": 30,
    "gender": "Male",
    "weight": 75,
    "temperature": 37.2,
    "heartRate": 80,
    "symptoms": "Persistent dry cough and mild fatigue",
    "duration": "5 days",
    "severity": "Moderate",
    "medicalHistory": "None",
    "medications": "None",
    "allergies": "Penicillin",
    "lifestyle": "Non-smoker, regular exercise",
    "context": "Recently traveled internationally"
  }
  ```
* **Response**:
  ```json
  {
    "diagnosis": [
      {
        "condition": "Viral Upper Respiratory Tract Infection",
        "reason": "Dry cough, mild fatigue, and sub-febrile temperature over 5 days in a young adult is highly suggestive of a common viral infection."
      }
    ],
    "medicines": [
      {
        "compound": "Dextromethorphan",
        "for": "Cough suppression"
      }
    ],
    "urgentAttention": "No. Monitor symptoms and maintain hydration. Seek medical care if dyspnea or high fever develops."
  }
  ```

#### Fetch Diagnosis History
* **Endpoint**: `GET /api/diagnosis/history`
* **Access**: Private (Requires `x-auth-token` header)
* **Response**: Returns a list of all historical diagnosis records created by the authenticated user, sorted in descending chronological order.
