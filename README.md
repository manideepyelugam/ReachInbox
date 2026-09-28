# ReachInbox Full-Stack Email Job Scheduler & Outreach Engine

A production-grade, distributed email scheduling service and modern outreach dashboard built for [ReachInbox.ai](http://ReachInbox.ai).

Designed to handle high-throughput cold email scheduling with **BullMQ delayed queues**, **Redis rate limiting**, **PostgreSQL idempotency state machines**, **Elasticsearch full-text search**, **Ethereal fake SMTP delivery**, and **Slack OAuth live rate-limit alerts**.

---

## 🌟 Key Features & Requirements Matrix

| Requirement | Implemented Approach | Key Highlights |
| :--- | :--- | :--- |
| **No Cron Jobs** | **BullMQ Delayed Jobs** | Uses `delay = targetTimestamp - Date.now()` with Redis-backed sorted sets. Strictly zero cron libraries. |
| **Restart Resilience** | **Redis + PostgreSQL Single Source of Truth** | Jobs survive server/worker restarts without duplicate sends or lost schedules. Idempotency enforced via deterministic job IDs (`email_job_${id}`). |
| **Fake SMTP Delivery** | **Ethereal Email Engine** | Nodemailer integration generating live test preview URLs (`nodemailer.getTestMessageUrl`) for browser rendering. |
| **Rate Limiting & Delay** | **Redis Atomic Hourly Counters & Throttling** | Enforces per-sender hourly limits (`ratelimit:sender:{id}:{hour}`). If exceeded, jobs are **not dropped**; they are automatically rescheduled into the next hour window. Configurable inter-send delay (e.g. 2s minimum delay). |
| **Slack OAuth & Live Alerts** | **Slack OAuth 2.0 + Webhooks** | Real Slack OAuth authorization flow. Dispatches instant Block Kit notifications the moment an hourly limit is breached. Safely falls back if disconnected. |
| **Elasticsearch Search** | **Elasticsearch Index Sync** | Auto-indexes scheduled and sent emails into an `email_jobs` index. Provides debounced full-text search across recipient, sender, subject, and body. |
| **Live Queue Visibility** | **BullMQ Dashboard (`@bull-board/express`)** | Real-time queue monitor mounted at `/admin/queues` showing delayed, active, completed, and failed jobs. |
| **Google Authentication** | **Google OAuth 2.0 & Demo Access** | Real Google Sign-In with JWT session issuance + Instant One-Click Demo Candidate sign-in for seamless evaluation. |
| **Outreach Dashboard** | **React + Tailwind CSS + Lucide Icons** | Pixel-perfect Figma design. Compose modal with CSV drag-and-drop parser, start time picker, scheduled table, sent table with Ethereal preview modals. |

---

## 🏗️ Architecture Overview

```
                                      ┌─────────────────────────────────────────┐
                                      │  Frontend: React 18 + Tailwind CSS     │
                                      │  - Google OAuth / Demo Session          │
                                      │  - Compose Modal (CSV Drag-and-Drop)    │
                                      │  - Live Elasticsearch Search Bar        │
                                      │  - Scheduled / Sent Tables & Previews   │
                                      └────────────────────┬────────────────────┘
                                                           │ (REST API / JWT)
                                                           ▼
                                      ┌─────────────────────────────────────────┐
                                      │  Backend: Express.js + TypeScript       │
                                      │  - Auth & Zod Request Validation        │
                                      │  - Bull-Board Live Monitor (/admin)     │
                                      │  - Slack OAuth Controller               │
                                      │  - Elasticsearch Search Controller      │
                                      └──────┬──────────────┬──────────────┬────┘
                                             │              │              │
                   ┌─────────────────────────┘              │              └────────────────────────┐
                   ▼                                        ▼                                       ▼
    ┌─────────────────────────────┐         ┌─────────────────────────────┐         ┌─────────────────────────────┐
    │  PostgreSQL (Prisma ORM)    │         │  Elasticsearch Node         │         │  BullMQ + Redis Storage     │
    │  - Users                    │         │  - email_jobs index         │         │  - Delayed Job Queue        │
    │  - SenderAccounts           │         │  - Full-text search         │         │  - Sliding Window Counters  │
    │  - EmailJobs (Idempotency)  │         │  - Auto-synced on lifecycle │         │  - Worker Concurrency (5-10)│
    │  - SlackIntegrations        │         └─────────────────────────────┘         └──────────────┬──────────────┘
    └─────────────────────────────┘                                                                │
                                                                                                   ▼
                                                                                    ┌─────────────────────────────┐
                                                                                    │  Worker & Throttle Engine   │
                                                                                    │  1. Check Redis Rate Limit  │
                                                                                    │     ├─ Limit Hit:           │
                                                                                    │     │  * Send Slack Alert   │
                                                                                    │     │  * Reschedule Next Hr │
                                                                                    │     └─ Allowed:             │
                                                                                    │        * Throttle Delay (2s)│
                                                                                    │        * Ethereal Fake SMTP │
                                                                                    │        * Generate Preview   │
                                                                                    │        * Update DB & ES     │
                                                                                    └─────────────────────────────┘
```

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js**: v18+ (tested on v22)
- **Docker & Docker Compose**: for PostgreSQL, Redis, and Elasticsearch
- **npm** or **yarn**

---

### Step 1: Clone and Install Dependencies
```bash
git clone <your-repo-url>
cd ReachInbox

# Install monorepo dependencies
npm install
```

---

### Step 2: Start Infrastructure (Postgres, Redis, Elasticsearch)
```bash
# Spin up Docker containers
npm run docker:up

# Verify containers are healthy
docker ps
```

The services run on:
- **PostgreSQL**: `localhost:5433` (custom port to avoid conflict with local postgres)
- **Redis**: `localhost:6379`
- **Elasticsearch**: `localhost:9200`

---

### Step 3: Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
cp .env.example backend/.env
```

Default environment parameters:
```env
PORT=5001
CLIENT_URL=http://localhost:5173
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/reachinbox_scheduler?schema=public
REDIS_HOST=localhost
REDIS_PORT=6379
ELASTICSEARCH_NODE=http://localhost:9200
ELASTICSEARCH_INDEX=email_jobs
WORKER_CONCURRENCY=5
MIN_EMAIL_DELAY_MS=2000
DEFAULT_MAX_EMAILS_PER_HOUR=50
JWT_SECRET=reachinbox_development_jwt_secret_key_2026
```

---

### Step 4: Run Database Migrations & Seeding
```bash
# Push schema to PostgreSQL
npm run prisma:push --workspace=backend

# Seed demo user & Ethereal test sender account
npm run seed --workspace=backend
```

---

### Step 5: Start Backend and Frontend
You can run both concurrently from the root directory:
```bash
npm run dev
```

Or run them individually in separate terminals:
```bash
# Terminal 1: Backend API & Worker
npm run dev:backend

# Terminal 2: Frontend Dashboard
npm run dev:frontend
```

Open your browser at:
- **Frontend Dashboard**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:5001](http://localhost:5001)
- **BullMQ Live Queue Monitor**: [http://localhost:5001/admin/queues](http://localhost:5001/admin/queues)

---

## 🧪 Testing & Verification Workflows

### 1. Verification of Server Restart Resilience (Crash Test)
1. In the frontend dashboard, click **"+ Compose Email"**.
2. Select **Single Recipient** or upload a CSV file.
3. Set the **Start Time** to **3 minutes into the future**.
4. Click **Schedule Email**.
5. Observe the email appearing in the **Scheduled Emails** table.
6. Now, **stop the backend server** (`Ctrl + C` in Terminal 1).
7. Wait 10 seconds, then restart the backend (`npm run dev:backend`).
8. Notice that:
   - The delayed job is retrieved by BullMQ from persistent Redis storage.
   - When the scheduled timestamp arrives, the worker picks up the job and sends it via Ethereal SMTP.
   - The status updates to **Delivered (SMTP)** in PostgreSQL, Elasticsearch, and the Frontend Dashboard without missing or duplicating sends.

---

### 2. Rate Limiting & Auto-Rescheduling Under Load
1. In the Compose Modal, upload a lead list with 50+ leads or configure sender limit to e.g. `5 emails/hour`.
2. Schedule the campaign.
3. The first 5 emails are delivered with the configured inter-email delay (e.g. 2s).
4. When email #6 hits the Redis atomic hourly counter (`count > limit`):
   - The job is **not dropped or marked failed**.
   - DB status is set to `RATE_LIMITED`.
   - BullMQ automatically reschedules the job with `delay = nextHourTimestamp - Date.now()`.
   - If connected to Slack, a real-time Block Kit notification is dispatched.

---

### 3. Slack OAuth 2.0 Live Integration
1. Click **"Connect Slack"** in the top navigation bar.
2. If Slack OAuth credentials are provided (`SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET`), complete the OAuth flow to authorize your workspace and channel.
3. In the Slack modal, click **"Send Live Rate-Limit Test Alert"**.
4. Check your Slack channel to see the rich interactive alert.
5. If Slack is not connected, the scheduler operates silently without errors or crashes.

---

### 4. Elasticsearch Live Search
1. In the search bar on the top right, type any search term (e.g. lead name, domain `@acme.com`, or subject keyword).
2. The search input debounces and queries the Elasticsearch `/api/search` endpoint.
3. Instant fuzzy and exact matches are rendered from the `email_jobs` index.

---

## 📁 Repository Structure

```
ReachInbox/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma         # PostgreSQL schema (User, SenderAccount, EmailJob, SlackIntegration)
│   ├── src/
│   │   ├── config/               # DB, Redis, Env configuration
│   │   ├── controllers/          # Auth, Email, Search, Slack REST controllers
│   │   ├── middlewares/          # JWT auth & Zod request validation
│   │   ├── queues/               # BullMQ Email Queue, Worker, and Bull-Board
│   │   ├── routes/               # Express API endpoints
│   │   ├── scripts/              # Seed script (Ethereal test accounts)
│   │   ├── services/             # Ethereal SMTP, Elasticsearch, RateLimiter, Slack
│   │   ├── app.ts                # Express application assembly
│   │   └── server.ts             # Server entrypoint and bootstrap
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/           # Header, ComposeModal, ScheduledTable, SentTable, PreviewModal, SlackModal, SearchBar
│   │   ├── context/              # React AuthContext (Google OAuth & Demo session)
│   │   ├── services/             # Axios API client
│   │   ├── types/                # TypeScript data interfaces
│   │   ├── App.tsx               # Main Dashboard
│   │   ├── main.tsx              # React DOM entrypoint
│   │   └── index.css             # Tailwind CSS & custom design tokens
│   ├── package.json
│   ├── tailwind.config.js
│   ├── vite.config.ts
│   └── tsconfig.json
├── docker-compose.yml            # PostgreSQL, Redis, Elasticsearch orchestration
├── MEMORY.md                     # Architecture tracker & project memory
├── package.json                  # Root npm workspaces configuration
└── README.md
```

---

## 🛡️ Non-Negotiable Engineering Constraints
- **Strictly No Cron**: Purely event-driven and delayed-queue scheduling via BullMQ.
- **Idempotency**: Prevent duplicate email sends through unique job keys (`email_job_${id}`) and atomic PostgreSQL status transitions.
- **Graceful Error Handling**: Safe fallbacks if Elasticsearch or Slack is temporarily unreachable.

---

## 🎥 Submission Video Outline (< 5 Minutes)
1. **0:00 - 1:00**: Architecture Walkthrough (BullMQ delayed queue, Redis sliding window rate limiter, Elasticsearch, PostgreSQL).
2. **1:00 - 2:30**: Dashboard Demo (Google/Demo Login, Compose modal with CSV drag-and-drop parsing, scheduling emails).
3. **2:30 - 3:30**: Ethereal SMTP Live Preview & Elasticsearch Search test.
4. **3:30 - 4:15**: Restart Resilience Demo (Stop backend server -> restart -> scheduled emails fire accurately).
5. **4:15 - 5:00**: Slack Rate Limit live notification & BullMQ visualizer monitor.
