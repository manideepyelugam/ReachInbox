# Project Memory & Architecture Tracker

## Project: ReachInbox Full-Stack Email Job Scheduler

### 1. Goal & Requirements Matrix
| Requirement | Tech / Pattern | Implementation Details | Status |
| :--- | :--- | :--- | :--- |
| **API & Backend** | Express.js + TypeScript | Clean layered architecture (controllers, services, queues, workers, middlewares, schemas) | Planned |
| **Database** | PostgreSQL + Prisma ORM | Tables: `User`, `SenderAccount`, `EmailJob`, `SlackIntegration`, `RateLimitLog`. Idempotency & state machine (`PENDING`, `SCHEDULED`, `PROCESSING`, `SENT`, `FAILED`, `RATE_LIMITED`) | Planned |
| **Queue & Scheduling** | BullMQ + Redis | Delayed jobs with timestamp calculation (NO CRON). Persistent Redis storage, survives server restarts. Worker concurrency configurable. | Planned |
| **SMTP Delivery** | Ethereal Email | Nodemailer with Ethereal fake SMTP. Generates live preview URLs stored in DB & ES for frontend test link viewing. | Planned |
| **Search Engine** | Elasticsearch | Indices for `email_jobs`. Full-text search across subject, body, recipient, sender, status, and date ranges. Auto-synced on insert/status changes. | Planned |
| **Rate Limiting & Delay** | Redis Sliding Window / Atomic Counter | Per-sender & global hourly limit. Safe across multi-instance workers. Reschedules to next hour window if limit reached. Configurable delay between sends (e.g. 2s). | Planned |
| **Slack OAuth & Alerts** | Slack OAuth 2.0 / Webhooks | Real OAuth connect flow. Dispatches instant rich Slack Block Kit notification when a sender hits hourly limit. Gracefully silent if disconnected. | Planned |
| **Queue Visibility** | BullBoard (`@bull-board/express`) | Real-time queue visualizer for active, completed, delayed, failed jobs mounted at `/admin/queues`. | Planned |
| **Authentication** | Google OAuth 2.0 + JWT | Real Google OAuth login flow. Displays user avatar, name, email, logout. | Planned |
| **Frontend UI** | React + TypeScript + Tailwind CSS | Pixel-perfect Figma design. Dark/light sleek UI. Scheduled tab, Sent tab (with Ethereal preview links), Compose modal with CSV lead upload, delay/rate limit controls, live ES search. | Planned |
| **Infra** | Docker Compose | Containers for PostgreSQL, Redis, Elasticsearch, Backend, Frontend. | Planned |

---

### 2. Architecture Diagram & Workflow
```
[ Frontend (React + Tailwind) ]
      |  - Google OAuth / JWT Auth
      |  - Compose Modal (CSV Parser, Delay, Hourly Limit, Start Time)
      |  - Live Search (Elasticsearch)
      |  - Scheduled & Sent Tables + Ethereal Preview
      v
[ Express.js API Layer ]
      |  - Validate payload (Zod)
      |  - Write email jobs to PostgreSQL (Status: SCHEDULED)
      |  - Index to Elasticsearch
      |  - Enqueue BullMQ delayed job: delay = target_time - current_time
      v
[ BullMQ + Redis Queue ]
      |  - Persistent storage (survives restart)
      |  - Concurrency workers (configurable)
      v
[ Worker & Rate Limiter Engine ]
      |  - Step 1: Check Redis hourly limit for sender (key: `rate_limit:{sender}:{hour_timestamp}`)
      |  - If EXCEEDED:
      |      * Trigger Slack OAuth notification (if user connected Slack)
      |      * Reschedule job to start of next hour window with preserved order
      |  - If OK:
      |      * Enforce inter-email delay (e.g. 2s minimum delay)
      |      * Send via Ethereal SMTP (Nodemailer)
      |      * Get Ethereal preview URL (`nodemailer.getTestMessageUrl`)
      |      * Update PostgreSQL (Status: SENT, sent_at: now, preview_url)
      |      * Update Elasticsearch document
```

---

### 3. Step-by-Step Git Commit Plan
1. **Commit 1**: `chore: initialize monorepo structure, docker compose infra, and workspace configuration`
2. **Commit 2**: `feat(db): configure prisma schema for users, senders, email jobs, and slack integrations`
3. **Commit 3**: `feat(queue): implement bullmq email queue, worker engine, and ethereal smtp transport`
4. **Commit 4**: `feat(rate-limit): implement redis sliding window rate limiter, inter-send delay, and auto-rescheduler`
5. **Commit 5**: `feat(slack): add slack oauth 2.0 integration and live rate-limit alert notifications`
6. **Commit 6**: `feat(search): integrate elasticsearch for real-time indexing and search of scheduled/sent emails`
7. **Commit 7**: `feat(api): build rest endpoints for scheduling, bulk csv upload, jobs list, ethereal test accounts, and bull-board`
8. **Commit 8**: `feat(frontend): scaffold react dashboard with tailwind design system and google auth integration`
9. **Commit 9**: `feat(frontend): build compose modal with csv lead parsing, scheduling options, and validation`
10. **Commit 10**: `feat(frontend): implement scheduled & sent email tables, elasticsearch live search, and ethereal preview modal`
11. **Commit 11**: `feat(frontend): integrate slack connect button, oauth callback handler, and bullmq live monitor view`
12. **Commit 12**: `docs: create comprehensive README with architecture, setup instructions, restart demo, and submission video guide`

---

### 4. Key Implementation Rules & Invariants
- **NO CRON**: Scheduling strictly via BullMQ delayed jobs (`delay: targetTime - Date.now()`).
- **No Duplicate Sends**: Strict idempotency using DB status check + job ID (`email_job_${id}`).
- **Restart Resilience**: BullMQ delayed jobs are saved in Redis; if Redis or server restarts, BullMQ reads delayed set and fires on time. DB keeps single source of truth.
- **Human-Quality Code**: Clean modular files, typed interfaces, descriptive naming, no redundant boilerplate comments, production-grade error handling.
