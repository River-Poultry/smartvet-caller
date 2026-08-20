# 🧠 SmartVet Internal Diagnostic AI & AI Prescriber Engine Integration Specification

This technical specification details the integration architecture between the **SmartVet Call Centre Platform (`smartvet-caller`)**, the **Internal Diagnostic AI System**, and the downstream **Internal AI Prescriber Engine**.

---

## 📐 Architecture & Pipeline Flow

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    CALL CENTRE AGENT DESK                                       │
│   Flock Metadata (Bird type, Age, Flock Size, Deaths) + Logged Symptoms + Audio Transcript      │
└────────────────────────────────────────────────┬────────────────────────────────────────────────┘
                                                 │ 1. POST /api/diagnose
                                                 ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                           SMARTVET CALL CENTRE BACKEND GATEWAY                                  │
│                              (Node.js / Express Orchestrator)                                   │
└───────────────┬─────────────────────────────────────────────────────────────────▲───────────────┘
                │ 2. POST /api/v1/diagnose                                        │
                ▼                                                                 │ 5. Unified
┌──────────────────────────────────────────────┐                                  │    Diagnosis
│        INTERNAL DIAGNOSTIC AI SYSTEM         │                                  │    + Prescription
│  • ML Classifier / LLM Expert Module         │                                  │    + Stock Match
│  • Disease Differential Confidence (0-1.0)   │                                  │
│  • Severity & Zoonotic / Notifiable Flags    │                                  │
└───────────────┬──────────────────────────────┘                                  │
                │ 3. Diagnoses + Flock Metrics                                    │
                ▼                                                                 │
┌──────────────────────────────────────────────┐                                  │
│         INTERNAL AI PRESCRIBER ENGINE        │                                  │
│  • Clinical Pharmacology Engine              │                                  │
│  • Active Ingredients & Formulations         │                                  │
│  • Dosage Calculation (Flock Size & Age)     │──────────────────────────────────┘
│  • Meat/Egg Withdrawal Periods               │ 4. Structured Prescription Plan
│  • Supportive Care & Biosecurity Protocols   │
└──────────────────────────────────────────────┘
```

---

## 1. Internal Diagnostic AI API Contract

### `POST /api/v1/diagnose`

Evaluates reported flock characteristics and symptoms to return a prioritized differential diagnosis.

#### Request Headers
```http
Content-Type: application/json
Authorization: Bearer <INTERNAL_DIAGNOSTIC_AI_KEY>
X-Request-Source: smartvet-callcenter
X-Correlation-ID: call-98432a10-2026-08-20
```

#### Request Payload
```json
{
  "call_id": 4821,
  "farmer_id": "ug-farmer-1029",
  "region": {
    "country": "Uganda",
    "district": "Wakiso",
    "sub_county": "Kira"
  },
  "flock_profile": {
    "bird_type": "broiler",
    "flock_size": 1200,
    "age_value": 24,
    "age_unit": "days",
    "age_category": "young_growing",
    "mortality_count": 85,
    "mortality_rate_pct": 7.08,
    "mortality_onset": "acute_24h",
    "prior_vaccinations": [
      "newcastle_day1",
      "gumboro_day14"
    ]
  },
  "clinical_signs": [
    { "symptom": "whitish_diarrhea", "severity": "severe", "duration_days": 2 },
    { "symptom": "ruffled_feathers", "severity": "severe", "duration_days": 2 },
    { "symptom": "huddling", "severity": "moderate", "duration_days": 2 },
    { "symptom": "vent_pecking", "severity": "severe", "duration_days": 1 }
  ],
  "raw_transcript_excerpt": "Birds are very depressed, huddling under heaters, droppings are watery white, losing 30-40 birds since yesterday morning."
}
```

#### Response Payload (`200 OK`)
```json
{
  "status": "success",
  "model_version": "poultry-diag-v2.4-prod",
  "inference_latency_ms": 142,
  "diagnoses": [
    {
      "disease_id": "DIS-GUMBORO-IBD",
      "name": "Gumboro Disease (Infectious Bursal Disease / IBD)",
      "confidence": 0.91,
      "matched_symptoms": ["whitish_diarrhea", "ruffled_feathers", "huddling", "vent_pecking"],
      "unmatched_symptoms": [],
      "severity_assessed": "critical",
      "is_emergency": true,
      "is_notifiable": false,
      "is_zoonotic": false,
      "clinical_summary": "Classic acute presentation of Gumboro in 3-week-old broilers with vent pecking, whitish diarrhea, and exponential mortality."
    },
    {
      "disease_id": "DIS-COCCIDIOSIS",
      "name": "Coccidiosis (Caecal / Intestinal)",
      "confidence": 0.38,
      "matched_symptoms": ["ruffled_feathers", "huddling"],
      "unmatched_symptoms": [],
      "severity_assessed": "moderate",
      "is_emergency": false,
      "is_notifiable": false,
      "is_zoonotic": false,
      "clinical_summary": "Possible co-infection or subclinical coccidiosis causing enteritis."
    }
  ],
  "follow_up_questions": [
    "Are you seeing any bloody or dark chocolate colored droppings in the litter?",
    "Did you administer the booster Gumboro vaccine between day 18 and 21?"
  ]
}
```

---

## 2. Internal AI Prescriber Engine API Contract

### `POST /api/v1/prescribe`

Takes the verified diagnosis and flock parameters to generate precise medical, supportive, and biosecurity prescriptions.

#### Request Headers
```http
Content-Type: application/json
Authorization: Bearer <INTERNAL_PRESCRIBER_AI_KEY>
X-Request-Source: smartvet-callcenter
```

#### Request Payload
```json
{
  "diagnosis": {
    "disease_id": "DIS-GUMBORO-IBD",
    "name": "Gumboro Disease (Infectious Bursal Disease / IBD)",
    "confidence": 0.91,
    "severity": "critical"
  },
  "flock_profile": {
    "bird_type": "broiler",
    "flock_size": 1200,
    "age_in_days": 24,
    "total_estimated_weight_kg": 960.0
  },
  "target_region": "Uganda"
}
```

#### Response Payload (`200 OK`)
```json
{
  "status": "success",
  "prescriber_model_version": "rx-poultry-v1.8",
  "primary_recommendations": [
    {
      "category": "supportive_electrolytes",
      "drug_name": "Introvit-ES-Oral / Stress-Pack Electrolytes",
      "active_ingredients": ["Vitamin C", "Vitamin E", "Sodium Chloride", "Potassium Citrate"],
      "indication": "Thermoregulatory stabilization and immunosuppression relief",
      "administration_route": "oral_drinking_water",
      "dosage": {
        "rate": "1g per 2 Litres of drinking water",
        "flock_daily_water_intake_litres": 220,
        "daily_product_required": "110g",
        "duration_days": 5
      },
      "withdrawal_period_days": {
        "meat": 0,
        "eggs": 0
      },
      "contraindications_warnings": "Do not administer sulfonamides or nephrotoxic antibiotics during acute IBD phase as kidneys and bursa are inflamed."
    },
    {
      "category": "secondary_infection_prophylaxis",
      "drug_name": "Amoxicillin Trihydrate 20% Water Soluble Powder",
      "active_ingredients": ["Amoxicillin"],
      "indication": "Prevention of secondary necrotic enteritis and Clostridial dermatitis",
      "administration_route": "oral_drinking_water",
      "dosage": {
        "rate": "20mg/kg body weight daily (approx 1g powder per 10 Litres water)",
        "daily_product_required": "96g",
        "duration_days": 4
      },
      "withdrawal_period_days": {
        "meat": 3,
        "eggs": 1
      },
      "contraindications_warnings": "Ensure clean drinkers daily. Do not under-dose to prevent antimicrobial resistance."
    }
  ],
  "biosecurity_actions": [
    "Increase brooder/house temperature by 2°C to reduce chilling stress on huddling birds.",
    "Rake wet litter around drinkers immediately to prevent ammonia spikes.",
    "Incinerate or bury all dead birds deep with lime to prevent viral spread.",
    "Implement footbath disinfection at flock entrance with Virkon-S / Glutacide."
  ]
}
```

---

## 3. Fallback & Resiliency Architecture

The SmartVet backend implements a **3-Tier Graceful Degradation Chain**:

```
[Tier 1: Internal Diagnostic AI + Prescriber Engine]
               │
               ▼ (On HTTP 5xx / Timeout > 4000ms)
[Tier 2: Cloud LLM Fallback (Gemini 2.0 Flash / Claude)]
               │
               ▼ (On Network Failure / Cloud Outage)
[Tier 3: Local Offline Deterministic Knowledge Base (diseaseDiagnosis.js)]
```

- **Timeout Budget**: Max 3.5 seconds allocated for internal microservice calls to keep telephone response instantaneous.
- **Stock Matching**: The call centre automatically matches prescribed active ingredients (`Amoxicillin`, `Vitamin C + Electrolytes`, etc.) with real-time stock in `warehouse_inventory` and `vet_inventory`.

---

## 4. Vet Board Closed-Loop Reinforcement Learning

When senior veterinarians review AI diagnoses on the `/vet-board` portal, corrections are submitted back to the internal AI diagnostic team:

### `POST /api/v1/feedback/diagnosis-review`
```json
{
  "call_id": 4821,
  "original_prediction": {
    "disease_id": "DIS-GUMBORO-IBD",
    "confidence": 0.91
  },
  "vet_review": {
    "reviewer_id": "vet-doc-04",
    "verdict": "incorrect",
    "diagnosis_accurate": false,
    "treatment_accurate": false,
    "true_disease": "Infectious Bursal Disease with concurrent Coccidiosis",
    "true_severity": "severe",
    "clinical_note": "Post-mortem showed haemorrhages on thigh muscles plus ballooned caeca containing blood.",
    "timestamp": "2026-08-20T09:30:00Z"
  }
}
```

---

## 5. Command-Line (CMD) Testing & Verification Guide

Share these commands with the engineering and data science teams to test the integration.

### Test Diagnostic AI API (Standalone)
```bash
curl -X POST "http://localhost:5000/api/v1/diagnose" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test_diagnostic_key_123" \
  -d '{
    "flock_profile": {
      "bird_type": "broiler",
      "flock_size": 1000,
      "age_value": 21,
      "age_unit": "days",
      "mortality_count": 40
    },
    "clinical_signs": [
      { "symptom": "whitish_diarrhea", "severity": "severe" },
      { "symptom": "huddling", "severity": "severe" }
    ]
  }'
```

### Test AI Prescriber Engine API (Standalone)
```bash
curl -X POST "http://localhost:5001/api/v1/prescribe" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test_prescriber_key_123" \
  -d '{
    "diagnosis": {
      "disease_id": "DIS-GUMBORO-IBD",
      "name": "Gumboro Disease",
      "confidence": 0.90,
      "severity": "critical"
    },
    "flock_profile": {
      "bird_type": "broiler",
      "flock_size": 1000,
      "age_in_days": 21
    },
    "target_region": "Uganda"
  }'
```

### Test Call Centre Gateway Unified Diagnose Endpoint
```bash
curl -X POST "http://localhost:4600/api/diagnose" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <AGENT_JWT_TOKEN>" \
  -d '{
    "symptoms": ["whitish_diarrhea", "huddling", "ruffled_feathers"],
    "bird_type": "broiler",
    "flock_details": {
      "birdType": "broiler",
      "flockSize": "1000",
      "ageValue": "21",
      "ageUnit": "days",
      "deadCount": "40"
    }
  }'
```

---

## 6. Required Environment Variables

Add the following to `backend/.env`:

```env
# Internal AI Microservices Configuration
INTERNAL_DIAGNOSTIC_AI_URL=http://internal-ai-service:5000/api/v1/diagnose
INTERNAL_DIAGNOSTIC_AI_KEY=your_diagnostic_api_key

INTERNAL_PRESCRIBER_AI_URL=http://internal-ai-service:5001/api/v1/prescribe
INTERNAL_PRESCRIBER_AI_KEY=your_prescriber_api_key

# Request Timeouts
AI_REQUEST_TIMEOUT_MS=3500

# Cloud Fallback (Optional)
GEMINI_API_KEY=your_gemini_api_key
```
