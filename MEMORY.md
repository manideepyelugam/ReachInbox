# Project Memory & Architecture Tracker

## Project: ReachInbox Full-Stack Email Job Scheduler

### 1. Goal & Requirements Matrix
| Requirement | Tech / Pattern | Implementation Details | Status |
| :--- | :--- | :--- | :--- |
| **API & Backend** | Express.js + TypeScript | Clean layered architecture (controllers, services, queues, workers, middlewares, schemas) | Completed & Tested |
| **Database** | PostgreSQL + Prisma ORM | Tables: `User`, `SenderAccount`, `EmailJob`, `SlackIntegration`, `RateLimitLog`. Idempotency & state machine (`PENDING`, `SCHEDULED`, `PROCESSING`, `SENT`, `FAILED`, `RATE_LIMITED`) | Completed & Tested |
| **Queue & Scheduling** | BullMQ + Redis | Delayed jobs with timestamp calculation (NO CRON). Persistent Redis storage, survives server restarts. Worker concurrency configurable (default: 5). | Completed & Tested |
| **SMTP Delivery** | Ethereal Email | Nodemailer with Ethereal fake SMTP. Generates live preview URLs stored in DB & ES for frontend test link viewing. | Completed & Tested |
| **Search Engine** | Elasticsearch | Index: `email_jobs`. Full-text search across subject, body, recipient, sender, status. Auto-synced on insert/status changes. | Completed & Tested |
| **Rate Limiting & Delay** | Redis Sliding Window / Atomic Counter | Per-sender & global hourly limit. Safe across multi-instance workers. Reschedules to next hour window if limit reached. Configurable delay between sends (default: 2s). | Completed & Tested |
| **Slack OAuth & Alerts** | Slack OAuth 2.0 / Webhooks | Real OAuth connect flow. Dispatches instant rich Slack Block Kit notification when a sender hits hourly limit. Gracefully silent if disconnected. | Completed & Tested |
| **Queue Visibility** | BullBoard (`@bull-board/express`) | Real-time queue visualizer for active, completed, delayed, failed jobs mounted at `/admin/queues`. | Completed & Tested |
| **Authentication** | Google OAuth 2.0 + JWT | Real Google OAuth login flow + One-Click Instant Demo Candidate sign-in. Displays user avatar, name, email, logout. | Completed & Tested |
| **Frontend UI** | React + TypeScript + Tailwind CSS | Pixel-perfect Figma design. Dark/light sleek UI. Scheduled tab, Sent tab (with Ethereal preview links), Compose modal with CSV lead upload, delay/rate limit controls, live ES search. | Completed & Tested |
| **Infra** | Docker Compose | Containers for PostgreSQL (`localhost:5433`), Redis (`localhost:6379`), Elasticsearch (`localhost:9200`). | Completed & Tested |

---

### 2. Complete Git Commit History
1. `chore: initialize monorepo structure, docker compose infra, and workspace configuration`
2. `feat(db): configure prisma schema for users, senders, email jobs, and slack integrations`
3. `feat(queue): implement bullmq email queue, worker engine, and ethereal smtp transport`
4. `feat(rate-limit): implement redis sliding window rate limiter, inter-send delay, and auto-rescheduler`
5. `feat(slack): add slack oauth 2.0 integration and live rate-limit alert notifications`
6. `feat(search): integrate elasticsearch for real-time indexing and search of scheduled/sent emails`
7. `feat(api): build rest endpoints for scheduling, bulk csv upload, jobs list, ethereal test accounts, and bull-board`
8. `feat(frontend): scaffold react dashboard with tailwind design system and google auth integration`
9. `feat(frontend): build compose modal with csv lead parsing, scheduling options, and validation`
10. `feat(frontend): implement scheduled & sent email tables, elasticsearch live search, and ethereal preview modal`
11. `feat(frontend): integrate slack connect button, oauth callback handler, and bullmq live monitor view`
12. `docs: create comprehensive README with architecture, setup instructions, restart demo, and submission video guide`

---

### 3. Key Invariants Verified
- **NO CRON**: Scheduling is strictly event-driven via BullMQ delayed jobs (`delay = targetTime - Date.now()`).
- **Idempotency**: Prevents double sending through deterministic `jobId = email_job_${id}` and database status transitions.
- **Restart Resilience**: BullMQ delayed jobs are saved in Redis; if the API server restarts, BullMQ retrieves jobs and executes them at the exact timestamp.
- **Human-Quality Clean Code**: Modular, strongly typed TypeScript codebase, zero extraneous AI-clutter comments, production-grade error handling.
