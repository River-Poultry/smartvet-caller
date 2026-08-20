# 🐔 SmartVet Africa — AI-Assisted Veterinary Call Centre

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat&logo=node.js&logoColor=white)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat&logo=react&logoColor=black)](https://reactjs.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-4169E1?style=flat&logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Vite](https://img.shields.io/badge/Vite-5.0+-646CFF?style=flat&logo=vite&logoColor=white)](https://vitejs.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=flat&logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![Twilio](https://img.shields.io/badge/Telephony-Twilio_Voice-F22F46?style=flat&logo=twilio&logoColor=white)](https://www.twilio.com)
[![Gemini](https://img.shields.io/badge/AI_Engine-Gemini_2.0_Flash-4285F4?style=flat&logo=google&logoColor=white)](https://deepmind.google/technologies/gemini/)

**SmartVet AI Call Centre** is an enterprise-grade, mission-critical call centre platform designed specifically for livestock and poultry veterinary triage across Sub-Saharan Africa. The system empowers call centre agents with real-time AI disease diagnostics, flock triage workflows, automated drug suggestions, multi-tier field dispatching (L1 Agent → L2 Paravet → L3 Field Vet → L4 Outbreak Emergency), central warehouse inventory allocation, and a dedicated **Vet Board** clinical review portal that feeds expert corrections back into AI model training.

---

## 📑 Table of Contents

1. [Executive Overview & Vision](#-executive-overview--vision)
2. [High-Level Architecture](#-high-level-architecture)
3. [User Levels & RBAC Matrix](#-user-levels--rbac-matrix)
4. [Complete Feature & Functional Modules](#-complete-feature--functional-modules)
   - [1. Telephony & Live Call Handling](#1-telephony--live-call-handling)
   - [2. Intelligent Call Companion & Symptom Tracker](#2-intelligent-call-companion--symptom-tracker)
   - [3. Dual-Tier AI Diagnosis Engine](#3-dual-tier-ai-diagnosis-engine)
   - [4. Internal Diagnostic AI & Prescriber Engine API Spec (AI_INTEGRATION_SPEC.md)](./AI_INTEGRATION_SPEC.md)
   - [5. Drug Suggestions & Stock Visibility](#4-drug-suggestions--stock-visibility)
   - [5. 4-Tier Field Dispatch & Escalation Pipeline](#5-4-tier-field-dispatch--escalation-pipeline)
   - [6. Warehouse & Field Vet Inventory](#6-warehouse--field-vet-inventory)
   - [7. Senior Vet Board Clinical Review & RLHF Portal](#7-senior-vet-board-clinical-review--rlhf-portal)
   - [8. Model Safety Alerts & Anomaly Triage](#8-model-safety-alerts--anomaly-triage)
   - [9. Insights, Analytics & ML Dataset Export](#9-insights-analytics--ml-dataset-export)
   - [10. Farmer CRM, Outreach & SMS Engine](#10-farmer-crm-outreach--sms-engine)
5. [Poultry Disease Knowledge Base](#-poultry-disease-knowledge-base)
6. [End-to-End Operational Workflows](#-end-to-end-operational-workflows)
7. [Database Schema & Migrations](#-database-schema--migrations)
8. [API Endpoint Reference](#-api-endpoint-reference)
9. [Real-time WebSocket Events](#-real-time-websocket-events)
10. [Configuration & Environment Variables](#-configuration--environment-variables)
11. [Installation & Local Development](#-installation--local-development)
12. [Production Deployment Guide](#-production-deployment-guide)
13. [Security & Compliance](#-security--compliance)

---

## 🌟 Executive Overview & Vision

Smallholder poultry farmers face significant losses due to delays in disease diagnosis, lack of immediate veterinary access, and improper medication usage. SmartVet AI Call Centre bridges the gap between rural farmers and certified veterinary professionals:

- **Instant Inbound Farmer Identification**: When a farmer calls, their complete history (farm location, past flock batches, previous disease incidents) is loaded immediately on the agent's screen.
- **Assisted Clinical Intake**: Agents capture flock demographics, age, flock size, mortality spikes, and symptoms with immediate severity calculation.
- **Sub-Second AI Disease Differential**: An offline expert knowledge base combined with Google Gemini LLM fallback provides differential diagnoses, treatment steps, biosecurity advice, and emergency flags.
- **Smart Field Dispatch**: Seamless escalation and geolocation-based dispatch to nearest paravets and veterinarians with live tracking.
- **Expert-in-the-Loop Continuous Learning**: Senior veterinarians validate AI outputs through the Vet Board dashboard, generating curated datasets for continuous model fine-tuning.

---

## 🏗 High-Level Architecture

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 SMARTVET ECOSYSTEM                                     │
└────────────────────────────────────────────────────────────────────────────────────────┘
                 ▲                                                    ▲
                 │ Inbound / Outbound Calls                           │ Django Core Sync
                 ▼                                                    ▼
    ┌─────────────────────────┐                          ┌───────────────────────────┐
    │   Twilio Voice / WebRTC  │                          │  smartvet.africa (Django) │
    │   & Africa's Talking SMS│                          │  Farmer, Vet & Farm DB    │
    └────────────┬────────────┘                          └─────────────┬─────────────┘
                 │                                                     │
                 ▼                                                     ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               BACKEND (Node.js 18+ ESM)                                │
│                                                                                        │
│  ┌───────────────────────┐   ┌────────────────────────┐   ┌─────────────────────────┐  │
│  │ Express REST Endpoints│   │ WebSocket Hub (/ws)    │   │ Telephony Controller    │  │
│  │ • Auth & User Mgt     │   │ • Live Call Signaling  │   │ • Twilio Voice & IVR    │  │
│  │ • Call History & Logs │   │ • Dispatch Broadcasts  │   │ • Conference Bridge     │  │
│  │ • Dispatch Escalation │   │ • Status Updates       │   │ • Call Audio Recording  │  │
│  └───────────┬───────────┘   └───────────┬────────────┘   └────────────┬────────────┘  │
│              │                           │                             │               │
│              ▼                           ▼                             ▼               │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐  │
│  │                              DIAGNOSTIC & AI ENGINES                             │  │
│  │  • Rule-Based Offline Engine (13+ Diseases, Mortality & Weighted Symptom Matrix) │  │
│  │  • Google Gemini 2.0 Flash / Claude Diagnostic Fallback Engine                   │  │
│  │  • Model Drift & Accuracy Anomaly Alerts Monitor                                │  │
│  └───────────────────────────────────────┬──────────────────────────────────────────┘  │
│                                          │                                             │
│                                          ▼                                             │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐  │
│  │                      PostgreSQL 14+ Database (16 Migrations)                     │  │
│  │  • agents • calls • call_symptoms • vet_dispatch_requests • vet_inventory        │  │
│  │  • warehouse_inventory • ai_suggestions • vet_reviews • model_alerts • tickets   │  │
│  └──────────────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────┬─────────────────────────────────────────────┘
                                           │ JSON API / WSS
                                           ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (React 18 + Vite)                                │
│                                                                                        │
│  ┌────────────────────────────────┐ ┌────────────────────────────────────────────────┐ │
│  │ Agent Dashboard (/agent)       │ │ Admin Operations (/admin)                      │ │
│  │ • Softphone & Caller Panel     │ │ • FBI-Style Dispatch Board (L1→L4 Escalation)  │ │
│  │ • Interactive Call Companion   │ │ • Real-Time Call Monitor & Audio Transcripts   │ │
│  │ • Live Symptom Logger          │ │ • Central Warehouse & Vet Inventory Allocator │ │
│  │ • AI Prescription & Drug Match │ │ • AI Safety Alerts Triage Center               │ │
│  │ • Dispatch Creation & SMS Form │ │ • Deep Analytics & Agent KPI Tracking          │ │
│  └────────────────────────────────┘ └────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────┐ ┌────────────────────────────────────────────────┐ │
│  │ Vet Board Portal (/vet-board)  │ │ Directories & CRM (/agent/farmers, /vets)      │ │
│  │ • Clinical Peer Review Queue   │ │ • Farmer CRM & Batch History                   │ │
│  │ • Multi-Factor AI Verdicts     │ │ • Field Veterinarian / Paravet Directory       │ │
│  │ • ML Dataset Training Exporter │ │ • Direct Callbacks & Outreach Campaigns        │ │
│  └────────────────────────────────┘ └────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 👥 User Levels & RBAC Matrix

The system enforces strict Role-Based Access Control (RBAC) across 5 distinct user levels:

| Role | Badge / Color | Primary Persona | System Capabilities & Permissions |
|:-----|:--------------|:----------------|:----------------------------------|
| **`admin` / `super_admin`** | `Shield` (Green) | Operations Director / System Admin | Full system governance: manage users, reset passwords, lock/unlock accounts, oversee all dispatches (L1–L4), manage warehouse inventory, triage AI model alerts, access business analytics, and export ML training datasets. |
| **`supervisor`** | `ClipboardList` (Blue) | Call Centre Supervisor | Monitor active calls in real time, reassign calls, approve high-level vet dispatches, oversee agent resolution rates, review call recordings, and view operational analytics. |
| **`agent`** | `Users` (Gray) | Call Centre Triage Operator | Answer inbound calls, initiate farmer callbacks, capture flock demographics, log symptoms, view AI differential diagnosis, check drug availability, create vet dispatches, and trigger farmer SMS confirmations. |
| **`vet_board`** | `Stethoscope` (Teal) | Senior Licensed Veterinarian | Access the dedicated **Vet Board Portal**: review AI diagnostic recommendations against historical call recordings, vote on clinical accuracy, submit true disease corrections, calibrate confidence scores, and review board-wide accuracy metrics. |
| **`trainee`** | `GraduationCap` (Yellow) | Onboarding Agent / Student | Read-only observation access: view active calls, farmer profiles, and companion recommendations for training purposes without dispatch or record-modification permissions. |

---

## 🚀 Complete Feature & Functional Modules

### 1. Telephony & Live Call Handling
- **Inbound Twilio Routing**: Inbound calls are received via Twilio Voice webhooks, matched against registered farmer phone numbers, and routed to the least-busy online agent.
- **Softphone & Conference Bridge**: Calls are bridged into secure conference rooms with support for agent browser audio and PSTN failover.
- **Queue & Hold System**: If all agents are occupied, callers enter a queued state with automated greeting and hold music.
- **Outbound Callbacks**: One-click outbound dialling directly from farmer profiles or outreach lists.
- **Real-Time Call Transcripts & Recording**: Audio recordings are captured, processed, and transcribed with speaker timestamps.

### 2. Intelligent Call Companion & Symptom Tracker
- **Flock Profiling**:
  - Bird types: Broiler, Layer, Sasso, Kienyeji (Indigenous), Turkey, Duck, Guinea Fowl, Quail.
  - Flock age calculation (Days, Weeks, Months) with automated categorization: Chick (0–2 wks), Young (2–6 wks), Growing (6–18 wks), Adult (>18 wks).
  - Flock size vs. mortality tracking with instant mortality rate calculation (% of flock lost) and automated color-coded severity alarms.
  - Prior vaccination checklists (Newcastle, Gumboro, Marek’s, Infectious Bronchitis, Fowl Typhoid, Fowl Pox).
- **Comprehensive Symptom Logger**:
  - Over 40 mapped clinical signs categorized by Body System (Respiratory, Nervous/Mobility, Digestive, Mortality Pattern, Physical Lesions).
  - Multi-level symptom severity selector (Mild, Moderate, Severe).
  - Quick-search filter for fast symptom tagging while on a live call.

### 3. Dual-Tier AI Diagnosis Engine
- **Tier 1: Offline Local Rule-Based Expert System (`diseaseDiagnosis.js`)**:
  - Zero-latency, highly deterministic rule engine that runs even if external APIs are unreachable.
  - Evaluates weighted symptom matrices, age bounds, bird species susceptibility, and mortality patterns.
  - Returns top differential diagnoses, confidence score (0–100%), matching symptoms, comprehensive clinical treatment protocols, and biosecurity/prevention guidelines.
  - Automatically flags **Emergency Conditions** (e.g., Newcastle, acute Gumboro, hemorrhagic Coccidiosis), **Notifiable Diseases** (mandatory reporting to Directorate of Veterinary Services), and **Zoonotic Risks** (e.g., Salmonella/Fowl Typhoid).
- **Tier 2: Cloud LLM Diagnostic Fallback (`claudeDiagnosis.js` / `aiService.js`)**:
  - Powered by **Google Gemini 2.0 Flash** / Claude API.
  - Ingests free-form farmer descriptions, flock metadata, and logged symptoms.
  - Generates nuanced differential diagnoses, plain-language agent summaries, and dynamic follow-up confirmation questions to ask the farmer.

### 4. Drug Suggestions & Stock Visibility
- **Live Inventory Mapping**: Maps diagnosed conditions to recommended pharmaceuticals, vaccines, antibiotics, coccidiostats, and supportive supplements (electrolytes, Vitamin K, B-complex).
- **Vet Stock vs. Warehouse Stock**: Cross-references needed medications against both central warehouse stock and the localized field inventory carried by nearby veterinarians.

### 5. 4-Tier Field Dispatch & Escalation Pipeline
- **Visual Kanban Dispatch Board**: Tracks all field requests through `Pending` → `Assigned` → `Resolved` → `Cancelled` states with live elapsed timers.
- **Escalation Levels**:
  - **L1 · Agent**: First-line remote telephone triage, supportive care instructions, biosecurity advice.
  - **L2 · Paravet**: Field paravet dispatch for basic flock treatments, routine vaccinations, and sample collection.
  - **L3 · Vet**: Certified veterinary surgeon dispatch for complex diagnostics, prescription-only medicines, or surgical/post-mortem procedures.
  - **L4 · Emergency**: High-priority outbreak containment for suspected notifiable diseases or massive flock mortality spikes.
- **Automated Paravet Matching**: Calculates proximity and availability, computes ETA (minutes), and dispatches task notifications.

### 6. Warehouse & Field Vet Inventory
- **Central Warehouse Inventory**: Manages bulk stocks of vaccines, antibiotics, disinfectants, vitamins, and equipment with minimum threshold reorder warnings.
- **Field Vet Allocations**: Transfer stock from central warehouse to individual field vet mobile kits.
- **Self-Reported Stock Reconciliation**: Field veterinarians can update remaining kit stock directly after completing farm visits.

### 7. Senior Vet Board Clinical Review & RLHF Portal
- **Peer-Review Queue**: Senior veterinarians review past call logs, farmer descriptions, and AI-generated diagnostic suggestions.
- **Multi-Factor Clinical Scoring**:
  - Verdict: `Correct` | `Incorrect` | `Partial`.
  - Granular validation: Diagnosis Accurate (Yes/No), Treatment Protocol Accurate (Yes/No), Severity Assessment Accurate (Yes/No), Confidence Score Well-Calibrated (Yes/No).
  - Correct Diagnosis designation (if AI was wrong), True Severity level, and qualitative clinical commentary.
- **Performance Analytics**: Real-time tracking of AI accuracy across diseases and confidence calibration (average confidence when right vs. wrong).
- **One-Click ML Training Export**: Exports reviewed clinical cases into structured **JSON** or **JSONL (`.ndjson`)** format ready for fine-tuning open-source models and reinforcement learning from veterinary feedback.

### 8. Model Safety Alerts & Anomaly Triage
- **Automated Drift Monitoring**: Detects recurring diagnostic errors, accuracy drops below safety thresholds (e.g., <75%), or disputed emergency cases.
- **Alert Triage Center**: Administrative interface to acknowledge alerts, assign developer notes, and log corrective actions.

### 9. Insights, Analytics & ML Dataset Export
- **Operational KPIs**: Total calls, average handle time (AHT), resolution rates, emergency ratio, call intent distribution.
- **Epidemiological Trends**: Disease mention frequencies, symptom clustering, geographical dispatch heatmaps.
- **Agent Performance Metrics**: Call volumes, resolution percentages, average call duration, and AI suggestion adoption rates.
- **Full Call Drill-down**: Complete audit trail per call with synchronized audio transcripts, symptoms logged, AI recommendations, and notes.

### 10. Farmer CRM, Outreach & SMS Engine
- **Farmer Profile & Flock History**: Integrates with SmartVet Django backend to pull farmer contact info, district, sub-county, flock sizes, and past consultations.
- **Outreach Campaigns**: Proactive scheduling of follow-up calls and vaccination reminder campaigns.
- **SMS Gateway**: Dispatches treatment summaries, prescription details, and dispatch confirmations directly to farmers' mobile phones via SMS.

---

## 🦠 Poultry Disease Knowledge Base

The built-in expert engine encompasses detailed clinical rules for major poultry diseases:

| Disease | Key Diagnostic Symptoms | Severity / Type | Emergency? | Notifiable? | Zoonotic? | Primary Treatment & Management Protocol |
|:---|:---|:---|:---:|:---:|:---:|:---|
| **Newcastle Disease (ND)** | Twisted neck (torticollis), circling, paralysis, gasping, green diarrhea, sudden mass death | Viral / Neurological & Respiratory | 🚨 **YES** | ⚠️ **YES** | ❌ No | No cure. Emergency isolation. Vaccinate unaffected birds with ND I-2. Disinfect premises. |
| **Gumboro Disease (IBD)** | Whitish/watery diarrhea, ruffled feathers, vent picking, huddling, trembling, sudden mortality spike | Viral / Immunosuppressive | 🚨 **YES** | ❌ No | ❌ No | Supportive care: high-dose Vitamin C + electrolytes. Increase house warmth. Gumboro vaccination on Days 14 & 21. |
| **Coccidiosis** | Bloody diarrhea, blood in droppings, severe lethargy, pale comb, huddling, weight loss | Parasitic (Protozoan) | ⚠️ High | ❌ No | ❌ No | Amprolium (Corid) or Toltrazuril in drinking water for 3–5 days + Vitamin K to stop intestinal bleeding. Replace wet litter. |
| **Fowl Typhoid / Salmonellosis** | Sulphur-yellow droppings, greenish-yellow diarrhea, swollen head, pale comb, high mortality | Bacterial (*S. Gallinarum*) | ⚠️ High | ⚠️ **YES** | ☣️ **YES** | Enrofloxacin or Doxycycline in drinking water for 5 days. Prompt disposal of carcasses. Thorough feeder disinfection. |
| **Fowl Pox** | Warts, scabs on comb/wattles (dry form), diphtheritic yellow membranes in mouth/trachea (wet form) | Viral / Cutaneous & Mucosal | 🟡 Moderate | ❌ No | ❌ No | Topical iodine/gentian violet for skin scabs. Gently clear mouth lesions in wet form. Broad-spectrum antibiotics for secondary infection. |
| **Infectious Bronchitis (IB)** | Rales (rattling), sneezing, coughing, watery eyes, misshapen/soft-shell eggs, egg drop | Viral / Respiratory & Reproductive | 🟡 Moderate | ❌ No | ❌ No | Oxytetracycline/Tylosin to prevent secondary bacterial infection. Increase ventilation and Vitamin A. |
| **Marek's Disease** | Asymmetrical paralysis, one leg forward/one back, drooping wings, grey eye / irregular pupil, skin tumors | Viral / Oncogenic | 🟡 Moderate | ❌ No | ❌ No | No treatment. Cull severely affected birds. Strict hatchery vaccination (HVT) on Day 1. |
| **Chronic Respiratory Disease (CRD)** | Swollen facial sinuses, nasal discharge, foamy eyes, gurgling, coughing | Bacterial (*Mycoplasma gallisepticum*) | 🟡 Moderate | ❌ No | ❌ No | Tylosin, Enrofloxacin, or Doxycycline for 5–7 days. Treat whole flock. Reduce house ammonia levels. |
| **Sudden Death Syndrome (SDS / Flip-over)** | Fast-growing broilers found dead on back with wings/legs outstretched, no prior illness | Metabolic / Cardiovascular | 🟡 Moderate | ❌ No | ❌ No | instantaneous death. Reduce feed energy density, dim lighting to reduce feeding frenzy, supplement Vitamin E & Selenium. |
| **Ascites (Water Belly)** | Distended fluid-filled abdomen, cyanotic (blue) comb, heavy panting, birds sitting on belly | Physiological / Hypoxic | 🟡 Moderate | ❌ No | ❌ No | Relieve severe pressure by sterile abdominal paracentesis. Cull chronic birds. Maximize house oxygen/ventilation. |
| **Gangrenous Dermatitis** | Dark, necrotic, purplish-black moist skin on wings/thighs, subcutaneous emphysema, rapid death | Bacterial (*Clostridium / Staph*) | 🚨 **YES** | ❌ No | ❌ No | Amoxicillin or Penicillin for 5–7 days. Immediate incineration of carcasses. Address underlying IBD/CAV immunosuppression. |
| **Chicken Infectious Anaemia (CAV)** | Extreme pallor of comb/wattles, severe anemia, subcutaneous hemorrhages, feather loss | Viral / Hematopoietic | 🟡 Moderate | ❌ No | ❌ No | Supportive Vitamin B12, iron, and multivitamin therapy. Antibiotics to prevent secondary infections. Breeder flock vaccination. |
| **Egg Drop Syndrome (EDS)** | Sudden collapse in egg production (10–40%), thin-shelled, soft-shelled, or shell-less pale eggs | Viral / Reproductive | 🟡 Moderate | ❌ No | ❌ No | No cure. Supportive mineral and calcium/Vitamin D3 supplementation. EDS vaccination before point of lay (14–18 weeks). |

---

## 🔄 End-to-End Operational Workflows

### Workflow A: Inbound Emergency Call Triage & Dispatch
```
1. Farmer calls SmartVet hotline (+256...)
   └── Twilio webhook routes call to least-busy online Agent
   └── WebSocket triggers incoming call banner on Agent Dashboard

2. Caller Panel automatically displays Farmer details & Farm location
   └── If new farmer: Agent performs 10-second quick registration

3. Agent opens Call Companion:
   ├── Enters Flock Profile: Broiler, 500 birds, 4 weeks old, 45 dead (9% mortality)
   └── Tags Symptoms: "twisted neck", "green diarrhea", "gasping" (Severe)

4. Local AI Engine returns Top Diagnosis:
   ├── Newcastle Disease (92% Confidence)
   ├── Flags: 🚨 EMERGENCY | ⚠️ NOTIFIABLE TO DVS
   └── Displays Immediate Biosecurity Protocol & Supportive Care

5. Agent clicks "Dispatch Vet":
   ├── Selects Urgency: L4 · Emergency Outbreak
   ├── Auto-selects closest Paravet based on GPS
   └── Dispatches task + triggers SMS confirmation to farmer

6. Agent completes Post-Call Wrap-up:
   └── Outcome: "vet_requested" | Intent: "disease_diagnosis"
```

### Workflow B: Vet Board Quality Assurance & RLHF Loop
```
1. Senior Veterinarian logs into `/vet-board`
2. Selects pending AI diagnoses from review queue
3. Reviews farmer audio transcript, symptoms, and AI suggestion
4. Submits clinical rating:
   ├── Verdict: Incorrect
   ├── Diagnosis Accurate: False | Treatment Accurate: False
   ├── Correct Disease: "Gumboro Disease (IBD)"
   ├── True Severity: "severe"
   └── Clinical Note: "Farmer described white watery droppings at 3 weeks, misclassified as ND."
5. Database updates accuracy stats & checks for Model Drift Alerts
6. Dataset is aggregated for one-click JSONL training export
```

---

## 🗄 Database Schema & Migrations

The database consists of 16 sequential SQL migrations:

| Migration | File Name | Description & Core Tables Created / Modified |
|:---|:---|:---|
| **001** | `001_initial_schema.sql` | Base call center schema: `agents`, `calls`, `call_transcripts`, `vet_dispatch_requests`. |
| **002** | `002_farmers_vets.sql` | Extended farmer & vet profile tables, `call_symptoms` tracking table, seed data. |
| **003** | `003_batches_tasks.sql` | Farm batches, scheduled vaccination schedules, and outreach task management. |
| **004** | `004_enrich_schema.sql` | Additional indices, call durations, intent tags, audio recording URLs. |
| **005** | `005_escalation_inventory.sql` | Escalation tiers (L1–L4), `vet_inventory` table for field stock tracking. |
| **006** | `006_warehouse_inventory.sql` | Central warehouse inventory schema (`warehouse_inventory`) and stock allocations. |
| **007** | `007_auth_security.sql` | Security hardening: `refresh_tokens`, `otp_codes`, failed login tracking, account lockout. |
| **008** | `008_django_link.sql` | Foreign key and external ID mapping to the central SmartVet Django API. |
| **009** | `009_agent_roles.sql` | Expanded user role enum (`admin`, `supervisor`, `agent`, `trainee`, `vet_board`). |
| **010** | `010_fix_phone_column.sql` | Phone number formatting normalization and international E.164 constraints. |
| **011** | `011_calls_next_steps.sql` | Structured next-step action logging and outcome categorization. |
| **012** | `012_agent_active_flag.sql` | `is_active` soft-disable flag for instant user access revocation. |
| **013** | `013_vet_board.sql` | `ai_suggestions` logging table and `vet_reviews` clinical review scoring table. |
| **014** | `014_restore_admin.sql` | Super-admin provisioning and recovery routines. |
| **015** | `015_feedback_columns.sql` | Inline suggestion feedback columns and agent-facing feedback flags. |
| **016** | `016_model_alerts.sql` | `model_alerts` table for tracking model drift, accuracy dips, and triage notes. |

---

## 🔌 API Endpoint Reference

### Authentication & User Management
| Method | Endpoint | Access | Description |
|:---|:---|:---|:---|
| `POST` | `/api/auth/login` | Public | Authenticate via email/phone + password; returns JWT & refresh token |
| `POST` | `/api/auth/refresh` | Public | Refresh expired JWT access token |
| `POST` | `/api/auth/logout` | Auth | Invalidate current session and clear refresh token |
| `POST` | `/api/auth/forgot-password` | Public | Trigger 6-digit OTP code to email |
| `POST` | `/api/auth/reset-password` | Public | Reset account password using verified OTP |
| `GET` | `/api/users` | Admin | List all call centre users with status and roles |
| `POST` | `/api/users` | Admin | Create a new user (Agent, Supervisor, Vet Board, Trainee, Admin) |
| `PATCH` | `/api/users/:id` | Admin | Update user details, role, or active status |
| `PATCH` | `/api/users/:id/reset-password` | Admin | Force password reset for a user |
| `DELETE` | `/api/users/:id` | Admin | Soft-delete / deactivate user |

### Telephony & Calls
| Method | Endpoint | Access | Description |
|:---|:---|:---|:---|
| `POST` | `/api/twilio/inbound` | Twilio | Handle incoming voice calls, match farmer, bridge to agent |
| `POST` | `/api/twilio/callback-answer`| Twilio | Connect outbound callback to conference room |
| `POST` | `/api/twilio/call-ended` | Twilio | Update call duration, recording SID, and release agent status |
| `GET` | `/api/calls/active` | Auth | Retrieve currently active call for the authenticated agent |
| `GET` | `/api/calls/recent` | Auth | Fetch recent call logs with pagination and filters |
| `GET` | `/api/calls/:id` | Auth | Get detailed call record including symptoms, notes, and transcript |
| `POST` | `/api/calls/:id/symptoms` | Auth | Log a symptom with severity to an active call |
| `DELETE` | `/api/calls/:id/symptoms/:sId` | Auth | Remove a logged symptom from a call |
| `POST` | `/api/calls/:id/wrapup` | Auth | Submit post-call summary, resolution outcome, and notes |

### Clinical AI & Vet Board
| Method | Endpoint | Access | Description |
|:---|:---|:---|:---|
| `POST` | `/api/diagnose` | Auth | Run dual-tier AI disease diagnosis from symptoms and flock data |
| `GET` | `/api/vet-board/queue` | Vet Board / Admin | Get paginated list of AI suggestions awaiting clinical review |
| `POST` | `/api/vet-board/review` | Vet Board / Admin | Submit or update clinical evaluation for an AI suggestion |
| `GET` | `/api/vet-board/stats` | Vet Board / Admin | Retrieve individual and board-wide AI accuracy statistics |
| `GET` | `/api/insights/overview` | Admin | Get comprehensive call center KPI and volume metrics |
| `GET` | `/api/insights/diseases` | Admin | Epidemiological disease frequency and action rate trends |
| `GET` | `/api/insights/alerts` | Admin | Retrieve open and resolved AI model drift safety alerts |
| `PATCH` | `/api/insights/alerts/:id` | Admin | Acknowledge or resolve an AI safety alert with developer notes |
| `GET` | `/api/insights/training-export`| Admin | Download ML-ready training dataset in JSON or JSONL format |

### Field Dispatch & Inventory
| Method | Endpoint | Access | Description |
|:---|:---|:---|:---|
| `GET` | `/api/vet-dispatch` | Auth | List all dispatch requests with status and escalation level |
| `POST` | `/api/vet-dispatch` | Auth | Create a new field dispatch request for a farmer |
| `PATCH` | `/api/vet-dispatch/:id/escalate` | Auth | Escalate dispatch level (L1 → L2 → L3 → L4) |
| `PATCH` | `/api/vet-dispatch/:id/assign` | Auth | Assign a specific field veterinarian or paravet |
| `PATCH` | `/api/vet-dispatch/:id/status` | Auth | Update dispatch status (`assigned`, `completed`, `cancelled`) |
| `GET` | `/api/inventory` | Auth | Query field vet kit inventory by vet ID or disease |
| `GET` | `/api/inventory/suggestions` | Auth | Get recommended medications and doses for diagnosed diseases |
| `GET` | `/api/inventory/warehouse` | Admin | List central warehouse stock levels and reorder thresholds |
| `POST` | `/api/inventory/warehouse/allocate` | Admin | Transfer stock from warehouse to field vet mobile inventory |

### Outreach & CRM
| Method | Endpoint | Access | Description |
|:---|:---|:---|:---|
| `POST` | `/api/outreach/callback` | Auth | Trigger automated outbound call to farmer |
| `POST` | `/api/outreach/sms` | Auth | Send customized treatment/advice SMS to farmer |
| `GET` | `/api/farmers` | Auth | Search and list registered farmers (proxied to Django core) |
| `GET` | `/api/farmers/:id` | Auth | Retrieve detailed farmer profile and farm batches |
| `GET` | `/api/vets` | Auth | List certified veterinarians and field paravets |

---

## ⚡ Real-time WebSocket Events

The WebSocket hub (`/ws?token=<JWT>`) enables bi-directional real-time signaling:

| Event Name | Direction | Payload Description | Trigger Condition |
|:---|:---:|:---|:---|
| `INBOUND_CALL` | Server → Agent | `{ callId, callSid, callerPhone, farmer, is_unknown }` | Inbound call matched to agent |
| `OUTBOUND_CALL_STARTED`| Server → Agent | `{ callId, callSid, conferenceName, farmerPhone }` | Outbound callback answered |
| `CALL_ENDED` | Server → Agent | `{ callId, durationSeconds, recordingUrl }` | Call hung up |
| `DISPATCH_CREATED` | Server → All | `{ dispatch }` | New dispatch added to Kanban board |
| `DISPATCH_UPDATED` | Server → All | `{ dispatchId, status, escalation_level, assigned_vet }`| Dispatch state or level altered |
| `STOCK_ALLOCATED` | Server → All | `{ vetId, productName, quantityAllocated }` | Warehouse stock transferred |
| `MODEL_ALERT_FIRED` | Server → Admin | `{ alertId, severity, message, disease }` | AI accuracy dip or drift detected |

---

## ⚙️ Configuration & Environment Variables

### Backend Configuration (`backend/.env`)

```env
# Server & Environment
PORT=4600
NODE_ENV=development
APP_URL=http://localhost:4600
FRONTEND_URL=http://localhost:5174

# Database (PostgreSQL)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/smartvet_callcenter

# Security & Authentication
JWT_SECRET=super-secure-jwt-secret-min-32-chars-long
JWT_EXPIRY=8h
REQUIRE_EMAIL_VERIFICATION=false

# External SmartVet Django Backend
SMARTVET_CORE_API=https://smartvet.africa
SMARTVET_API_KEY=your-django-api-key

# Telephony (Twilio)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+256XXXXXXXXX

# AI & LLM Diagnosis Engines
GEMINI_API_KEY=AIzaxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
AI_MODEL_API_URL=https://api.openai.com/v1/chat/completions # or custom ML endpoint
AI_MODEL_API_KEY=your-optional-ai-key

# SMS Gateway (Africa's Talking / Twilio)
AFRICASTALKING_USERNAME=smartvet
AFRICASTALKING_API_KEY=atsk_xxxxxxxxxxxxxxxxxxxxxxxxxx
SMS_SENDER_ID=SmartVet
```

### Frontend Configuration (`frontend/.env.local`)

```env
VITE_API_BASE_URL=http://localhost:4600/api
VITE_WS_URL=ws://localhost:4600/ws
```

---

## 💻 Installation & Local Development

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **PostgreSQL**: v14.0 or higher
- **npm** or **yarn** / **pnpm**

### 1. Clone & Set Up Database
```bash
git clone https://github.com/River-Poultry/smartvet-caller.git
cd smartvet-caller

# Create PostgreSQL database
createdb smartvet_callcenter
```

### 2. Configure & Launch Backend
```bash
cd backend
cp .env.example .env
# Edit .env with your PostgreSQL credentials and API keys

npm install
npm run migrate       # Runs all 16 SQL database migrations
npm run dev           # Starts Express backend on http://localhost:4600
```

### 3. Configure & Launch Frontend
```bash
cd ../frontend
cp .env.example .env.local
# Verify VITE_API_BASE_URL points to :4600/api

npm install
npm run dev           # Starts Vite dev server on http://localhost:5174
```

### 4. Default Seed Credentials (Development)
| Role | Email | Password |
|:---|:---|:---|
| **Admin** | `admin@smartvet.africa` | `Admin123!` |
| **Vet Board** | `vetboard@smartvet.africa` | `VetBoard123!` |
| **Agent** | *(Created via Admin Dashboard or seed)* | `Agent123!` |

---

## 🚢 Production Deployment Guide

### Option 1: Docker Compose (All-in-One)
```bash
# Build and run containers in detached mode
docker-compose up -d --build

# Run migrations inside the backend container
docker-compose exec backend npm run migrate
```

### Option 2: Split Cloud Deployment (Railway + Vercel)

#### Backend on Railway / Render:
1. Connect this repository to Railway/Render and select the `/backend` root directory.
2. Attach a managed PostgreSQL database.
3. Configure environment variables in the dashboard from `backend/.env.example`.
4. The deployment command executes:
   ```bash
   npm run migrate && npm start
   ```

#### Frontend on Vercel:
1. Connect repo to Vercel with Root Directory set to `frontend`.
2. Configure build environment variables:
   - `VITE_API_BASE_URL`: `https://your-backend-api.railway.app/api`
   - `VITE_WS_URL`: `wss://your-backend-api.railway.app/ws`
3. Deploy! `vercel.json` ensures all SPA client-side routes rewrite cleanly to `index.html`.

---

## 🛡 Security & Compliance

- **Stateless JWT Security**: Industry-standard JSON Web Tokens with short access lifetimes (15m) and secure, cryptographically hashed refresh tokens stored in PostgreSQL.
- **Brute-Force & Lockout Protection**: Automatic account lockout for 5 minutes after 5 consecutive failed login attempts.
- **Password Security**: Passwords hashed using `bcryptjs` with 12 salt rounds and complexity validation (minimum 8 characters, letters, and numbers).
- **HTTP Security Headers**: Powered by `helmet` to protect against cross-site scripting (XSS), clickjacking, and MIME-type sniffing.
- **Strict Role Gating**: Middleware guarantees that critical endpoints (Vet Board review, user management, warehouse allocation, training exports) are locked to authorized roles.
- **Zero Secrets Committed**: All API keys, database credentials, and secrets are strictly managed via environment variables and excluded by `.gitignore`.

---

## 📄 License & Intellectual Property

Copyright © 2026 **SmartVet Africa / River Poultry**. All rights reserved.
Unauthorized copying, modification, distribution, or commercial use of this software without explicit written permission is strictly prohibited.
