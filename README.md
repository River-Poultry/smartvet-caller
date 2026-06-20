# SmartVet AI Call Centre

AI-assisted veterinary dispatch call centre for River Poultry / SmartVet Africa. Agents handle inbound farmer calls, track symptoms in real time, get instant AI disease diagnosis, and dispatch field vets — with a full escalation chain (L1 Agent → L2 Paravet → L3 Vet → L4 Emergency).

---

## Architecture

```
smartvet-ai-callcenter/
├── frontend/          React 18 + Vite + Tailwind CSS  (port 5174)
└── backend/           Node.js + Express + PostgreSQL   (port 4600)
```

### Frontend (Vite + React)
- **State**: Zustand (`authStore`, `callStore`)
- **Routing**: React Router v6
- **Realtime**: WebSocket via `useWebSocket` hook
- **Theme**: Dark olive (River Poultry brand), light mode supported

### Backend (Express ESM)
- **Auth**: JWT (8h expiry) + bcryptjs
- **Database**: PostgreSQL via `pg` — 6 sequential migrations
- **Realtime**: `ws` library, keyed per agentId
- **AI Diagnosis**: Local offline engine (`diseaseDiagnosis.js`) — 10 poultry diseases — with pluggable external model via `AI_MODEL_URL`
- **Core API**: Proxies to live Django backend at `smartvet.africa` for farmer/vet data

### Database migrations (run in order)
| File | Purpose |
|------|---------|
| 001_initial_schema.sql | Core tables: agents, calls, dispatch |
| 002_farmers_vets.sql | Farmer/vet/call_symptoms tables + seeds |
| 003_batches_tasks.sql | Farm batches and scheduled tasks |
| 004_enrich_schema.sql | Schema enrichments |
| 005_escalation_inventory.sql | Escalation levels + vet_inventory |
| 006_warehouse_inventory.sql | Central warehouse + stock allocations |

---

## Local Development

### Prerequisites
- Node.js 18+
- PostgreSQL 14+

### Backend
```bash
cd backend
cp .env.example .env        # fill in values
npm install
npm run migrate             # run all migrations
npm run dev                 # starts on :4600
```

### Frontend
```bash
cd frontend
cp .env.example .env.local  # set VITE_API_BASE_URL if needed
npm install
npm run dev                 # starts on :5174, proxies /api → :4600
```

### Default credentials (development only)
```
Admin:  admin@smartvet.africa  /  Admin123!
Agent:  (create via admin panel or seed)
```

---

## Deployment

### Frontend → Vercel
```bash
cd frontend
# Set environment variables in Vercel dashboard:
#   VITE_API_BASE_URL = https://your-api.railway.app/api
#   VITE_WS_URL      = wss://your-api.railway.app
vercel --prod
```
`vercel.json` is included — all routes rewrite to `index.html` (SPA).

### Backend → Railway
```bash
# In Railway dashboard:
# 1. Connect this repo, set root directory to /backend
# 2. Add environment variables from .env.example
# 3. Railway auto-runs: npm run migrate && npm start
```
`backend/railway.toml` is included with the correct start command.

### Required environment variables (production)
See `backend/.env.example` and `frontend/.env.example`.

---

## Key Features

| Feature | Location |
|---------|----------|
| Live call handling (Twilio) | `backend/src/routes/twilio.js` |
| Symptom tracker + AI diagnosis | `frontend/src/components/agent/CallCompanion.jsx` |
| Local AI prescription engine | `backend/src/services/diseaseDiagnosis.js` |
| Pluggable external AI model | `backend/src/services/aiModel.js` (`AI_MODEL_URL`) |
| Caller identification + quick-register | `frontend/src/components/agent/CallerPanel.jsx` |
| FBI-style dispatch board | `frontend/src/pages/AdminDashboard.jsx` |
| L1→L4 escalation chain | `backend/src/controllers/dispatchController.js` |
| Vet field stock + warehouse inventory | `backend/src/controllers/inventoryController.js` |
| Live Django data proxy | `backend/src/services/smartvetCore.js` |

---

## API Overview

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/login` | Agent login |
| GET | `/api/calls/active` | Active call for agent |
| POST | `/api/calls/:id/symptoms` | Log symptom to call |
| POST | `/api/diagnose` | AI diagnosis from symptoms |
| GET | `/api/inventory/suggestions` | Drug suggestions by disease |
| POST | `/api/vet-dispatch` | Create dispatch request |
| PATCH | `/api/vet-dispatch/:id/escalate` | Escalate dispatch level |
| GET | `/api/inventory/warehouse` | Central warehouse stock |
| POST | `/api/inventory/warehouse/allocate` | Allocate stock to vet |
| GET | `/api/ai/status` | AI model status |

---

## Security

- JWT tokens — never stored server-side, validated on every request
- Passwords hashed with bcryptjs (12 rounds)
- Helmet.js security headers on all responses
- CORS restricted to `FRONTEND_URL`
- Admin-only routes gated by `requireAdmin` middleware
- No secrets committed — `.env` is in `.gitignore`
