# SmartVet Call Center

A support tool for call center agents handling farmer calls and dispatching paravets, with an AI assistant powered by a custom model.

## Features

- **Case management** — log farmer calls as cases, track status (open → assigned → in progress → resolved)
- **AI assistant** — agents can ask animal health/protocol questions during a call
- **Call transcription & summarization** — paste call notes and get an AI-generated summary (symptoms, animal type, urgency, recommended action) attached to the case
- **Paravet dispatch** — assign available paravets to open cases and schedule visits
- **Knowledge base** — searchable articles on animal health topics

## Stack

- **Frontend**: Vite + React + Tailwind CSS (`frontend/`)
- **Backend**: Node.js + Express + SQLite (`backend/`)

## Setup

### Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

Runs on `http://localhost:4500`. Database file (`data.sqlite`) is created automatically.

### Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Runs on `http://localhost:5173` (or next available port).

## Connecting your AI model

The AI assistant and transcript summarizer call out to your own trained model via a REST endpoint. Set these in `backend/.env`:

```
AI_MODEL_API_URL=https://your-ai-model-endpoint.example.com/v1/generate
AI_MODEL_API_KEY=your-api-key
```

The backend (`backend/src/services/aiService.js`) sends `{ prompt, task }` as a JSON POST and expects a JSON response containing one of `response`, `output`, or `text`. Adjust the request/response shape in that file to match your model's API contract.

Until configured, the AI Assistant page and "Summarize with AI" button will show a clear "not configured" message instead of failing silently.
