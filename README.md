# SmartVet Call Center

A support tool for call center agents handling farmer calls and dispatching paravets, with an AI assistant powered by a custom model.

## Features

- **Case management** — log farmer calls as cases, track status (open → assigned → in progress → resolved)
- **AI assistant** — agents can ask animal health/protocol questions during a call
- **Call transcription & summarization** — paste call notes and get an AI-generated summary (symptoms, animal type, urgency, recommended action) attached to the case
- **Paravet dispatch** — assign available paravets to open cases and schedule visits
- **Automatic call recording** — starting a "Call Session" on a case automatically records and uploads the audio when the call ends, building a training dataset for the AI assistant
- **User accounts & access levels** — JWT-based login with role-based permissions (admin, supervisor, agent, paravet)

## User accounts & access levels

Roles are modeled after a standard dispatch/emergency call center:

| Role | Access |
| --- | --- |
| **Administrator** | Full access, including the User Accounts page to create/edit/disable users and assign roles |
| **Supervisor** | Full access to cases, dispatch, paravets, recordings (including deleting cases/recordings); no user management |
| **Agent / Dispatcher** | Create and manage cases, dispatch paravets, record calls, use the AI assistant |
| **Paravet** | Read-only access to cases, dispatch, paravets, recordings and AI assistant |

A fresh database seeds four default accounts (change these passwords before going to production):

| Email | Password | Role |
| --- | --- | --- |
| admin@smartvet.local | admin123 | admin |
| supervisor@smartvet.local | super123 | supervisor |
| agent@smartvet.local | agent123 | agent |
| paravet@smartvet.local | paravet123 | paravet |

The signing secret for login tokens is `JWT_SECRET` in `backend/.env` — change it in production.

## Automatic call recording

Open a case and click **Start Call** in the "Call Session" panel. The browser begins recording your microphone immediately (after granting permission once). Clicking **End Call** stops the recording and uploads it automatically — no manual save step — tagging it with the case, the signed-in agent, and duration. Recordings and transcripts can be reviewed on the Call Recordings page to build a dataset for training the AI assistant.

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
