# Expense Manager

Monthly expense manager for a company: 4 fixed categories, one total monthly
limit, manual and voice entry (Hindi/Hinglish/English), no login — gated by a
single access-token header instead.

## Feature checklist

- [x] Phase 0 — Repo stripped to expense manager base
- [x] Phase 1 — Backend data model, limit, aggregation, zero-fill
- [x] Phase 2 — Dashboard and manual entry UI
- [x] Phase 3 — Voice input pipeline
- [x] Phase 4 — Weekly and monthly reports
- [x] Phase 5 — Analytics and comparisons
- [x] Phase 6 — Polish (local-only deployment, no live hosting)

## Tech stack

- Backend: Node, Express, Mongoose
- Frontend: React, Vite, Tailwind, Recharts
- Database: MongoDB
- Voice: Groq (Whisper transcription + LLM extraction)

## Setup

```
git clone https://github.com/prathamthatte52701/expense-manager
npm run install:all
```

Create `.env` in `server/` with:

```
MONGODB_URI
GROQ_API_KEYS
GROQ_MODEL
GROQ_WHISPER_MODEL
ACCESS_TOKEN
PORT
```

Create `.env` in `client/` with:

```
VITE_ACCESS_TOKEN
```

## Run locally

```
npm run dev
```

Runs server and client concurrently. Server on `PORT` (default 8000), client on
`http://localhost:3000`.

## Auth

No login screen. Every `/api/*` request must include header `x-app-token`
matching `ACCESS_TOKEN`, or it's rejected with 401.

## Folder structure

```
server/
  src/
    config.js         env + fixed category list
    models/            Transaction, MonthSetting
    routes/            budget.js, export.js
    services/          budget.js (aggregation), groq.js (voice)
    middleware/auth.js  access-token gate
client/
  src/
    pages/              Dashboard, AddSpendPage, HistoryPage, CalendarPage,
                         AnalyticsPage, ReportsPage, SettingsPage
    components/          TransactionModal, VoiceEntryModal, ui primitives
    lib/                 api client, finance/date helpers
```

## Deployment

Local use only — not deployed.
