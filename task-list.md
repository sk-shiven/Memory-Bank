# 365 — 1-Week Task List (MVP Build)

**Scope note:** One week is realistic for the **MVP core loop only** — push notification → question → text answer → timeline, deployed and working end-to-end. Photo/voice answers, AI personalization, and the day-365 recap are explicitly **out of scope** for this week (they're Phases 2–5 in the PRD roadmap) and are listed at the bottom as stretch/next-week items so nothing gets silently dropped.

---

## Day 1 — Server & Database Setup

- [ ] Provision Oracle Cloud Always Free VM (ARM, 4 vCPU / 24 GB RAM)
- [ ] SSH in, apply OS updates, set up a non-root user
- [ ] Configure firewall (allow only SSH + HTTP/HTTPS)
- [ ] Set up SSH key-based login, disable password login
- [ ] Install Postgres on the VM
- [ ] Create the database and the three core tables: `users`, `questions`, `answers`
- [ ] Install Node.js and set up the basic project structure for the API server

## Day 2 — API Server Basics

- [ ] Set up Express (or chosen framework) skeleton
- [ ] Implement Google OAuth login flow (server side)
- [ ] Implement `users` endpoints: create/get user, save notification time preference
- [ ] Set up environment variables for secrets (DB credentials, AI API key) — confirm none are committed to git
- [ ] Set up nginx as a reverse proxy in front of the API server
- [ ] Get HTTPS working (domain + TLS certificate)

## Day 3 — Question Generation (Static/Simple First)

- [ ] Write a static fallback question bank (30–50 questions is enough to start) as a safety net
- [ ] Integrate Claude Haiku 4.5 (`claude-haiku-4-5-20251001`) for basic question generation — no personalization yet, just varied prompts
- [ ] Build the scheduled job that generates the next day's question ahead of time and stores it in `questions`
- [ ] Test the fallback path (simulate AI call failure, confirm a question still gets served)

## Day 4 — Answers & Timeline API

- [ ] Implement endpoint to fetch "today's question" for a user
- [ ] Implement endpoint to submit a text answer
- [ ] Implement endpoint to fetch the full timeline (past questions + answers) for a user
- [ ] Basic validation and error handling on all endpoints
- [ ] Manual test pass on the full backend flow with a REST client (e.g. curl/Postman) before touching the app

## Day 5 — Flutter Client: Core Screens

- [ ] Set up Flutter project structure
- [ ] Build Google Sign-In flow on the client
- [ ] Build "today's question" screen with text answer input + submit
- [ ] Build timeline screen (simple scrollable list of past Q&As)
- [ ] Wire up API calls to the backend endpoints from Day 4

## Day 6 — Push Notifications

- [ ] Set up Firebase project and connect FCM to the Flutter app
- [ ] Implement device token registration (client sends token to backend, stored against user)
- [ ] Implement server-side job to trigger the daily push notification at each user's chosen time
- [ ] Test end-to-end: notification fires → tapping it opens the app to today's question

## Day 7 — Integration, Deployment, and Buffer

- [ ] Full end-to-end manual test: sign up → set notification time → receive notification → answer → see it in timeline → next day's question is ready
- [ ] Deploy latest code to the Oracle VM (manual deploy: pull + restart)
- [ ] Set up a process manager / systemd so the API server restarts automatically on crash or reboot
- [ ] Fix any bugs found during end-to-end testing
- [ ] Buffer time — this day will likely get eaten by whatever broke on Days 1–6, and that's normal

---

## Explicitly Deferred (Next Week+)

- [ ] Photo answer support (object storage integration)
- [ ] Voice note answer support (object storage integration)
- [ ] AI personalization (theme tagging + feeding recent themes into question generation)
- [ ] Deploy automation beyond manual (deploy script, CI/CD)
- [ ] Day-365 recap/yearbook (v2 feature)

---

*If a day's tasks run over, prioritize keeping the chain unbroken (Days 1→4 are foundational — the app doesn't function without them) over hitting every checkbox on schedule. Days 5–7 are more flexible to compress if needed.*
