# 365 — Product Requirements Document

**Status:** Draft
**Platform:** Android (Flutter)
**Owner:** Shiven
**Document version:** v0.2

---

## 1. Overview

365 is an Android app that asks the user one question per day for 365 days. Each answer — text, photo, or voice note — becomes a memory. By the end of the year, the user has an AI-curated, personalized journal built from 365 small daily reflections, with no upfront writing effort required to start.

This project serves two goals: a genuinely useful daily-journaling habit tool, and a portfolio-quality full-stack project (mobile client, self-hosted backend, and AI integration).

## 2. Problem Statement

Journaling has real value but a high activation cost — a blank page is intimidating and most people abandon the habit within days. A single, specific, AI-generated question each day lowers the barrier to almost nothing: there is no blank page, only a prompt to respond to.

## 3. Goals & Non-Goals

### Goals
- Deliver one new question per day via push notification, for 365 consecutive days.
- Let the user answer with text, a photo, or a voice note.
- Personalize future questions based on the themes and content of past answers.
- Give the user a simple, scrollable timeline of all past memories.
- Ship a working core loop first; treat richer features as later milestones.

### Non-Goals (for v1)
- Social features (sharing memories with other users, following, comments).
- Cross-platform support (iOS is out of scope for v1; Android only).
- Auto-generated year-end recap/yearbook — explicitly deferred to v2.
- Gamification (streaks, badges, leaderboards).

## 4. Target User

Primarily the builder, as a daily personal-use app, with design decisions made generally enough to support other users who want a low-effort way to keep a year-long journal.

## 5. Core User Flow

1. User signs up / logs in via social login (Google).
2. User sets (or accepts a default) daily notification time.
3. Each day, a push notification announces that today's question is ready.
4. User opens the app, reads the question, and answers with text, a photo, a voice note, or a combination.
5. The answer is saved and appears as a new entry in the timeline.
6. The next day's question is generated ahead of time, informed by the themes of recent answers.
7. User can scroll back through the timeline at any point to revisit past memories.

## 6. Feature Scope

### MVP (v1)
- Push notification delivery of a daily question.
- Text-only answers.
- Basic chronological timeline view.
- Simple/static AI-generated questions (no personalization yet).
- Social login authentication.

### v1.x additions
- Photo answers, with object storage for images.
- Voice note answers, with object storage for audio.
- Server-side scheduled question generation (batched ahead of time) with a static fallback bank.

### v1.x+ — personalization
- AI generates each new question using a compact summary of recent answer themes, plus the list of previously asked questions to avoid repetition.

### v2
- Auto-generated shareable year-end recap / "yearbook" once 365 days of data exists.

## 7. System Architecture

Backend is self-hosted rather than a managed BaaS, on a self-managed Oracle Cloud VM, prioritizing uptime for a service that needs to run daily for a year. Oracle Cloud's Always Free tier (4 ARM vCPUs, 24 GB RAM) is the intended instance, chosen for cost — this should be reconfirmed against Oracle's current offer terms before provisioning, since free-tier terms can change.

### Components
- **Client:** Flutter (Android). Screens: today's question, answer composer (text/photo/voice), timeline, settings/notification time.
- **API server:** Node/Express (or similar) running on the VM, behind a reverse proxy (e.g. nginx) handling HTTPS.
- **Database:** Postgres — relational, self-hosted on the VM. Chosen over NoSQL for the naturally relational users → questions → answers structure.
- **Object storage:** S3-compatible bucket storage for photos and voice notes; the database stores only references/URLs, not the media files themselves.
- **Push notifications:** Firebase Cloud Messaging (FCM) as the delivery channel, triggered server-side on the user's chosen schedule — used purely for delivery, independent of the self-hosted backend.
- **AI question generation:** a scheduled server-side job using **Claude Haiku 4.5** (model ID `claude-haiku-4-5-20251001`) to generate questions ahead of time (e.g. a week's worth in advance) rather than at notification time, so delivery is never blocked on an API call. The AI API key stays server-side, never embedded in the client. Haiku 4.5 was chosen for its low cost and speed, appropriate for a short, high-volume, low-complexity generation task — current pricing should be reconfirmed at docs.claude.com before budgeting, as rates can change.
- **Auth:** social login (Google), integrated via OAuth on the server side.

## 8. Data Model (draft)

| Table | Key fields |
|---|---|
| users | id, auth provider id, notification time preference, created_at |
| questions | id, user_id, day_number, question_text, generated_at, theme_tags |
| answers | id, question_id, text, photo_url, audio_url, created_at |

## 9. Personalization Logic

- Each answer is lightly tagged with themes/sentiment, extracted at answer time or during the next generation pass, to keep this cheap rather than re-processing full history each time.
- Question generation is given a compact summary of recent themes (not the full raw history) plus the full list of past question texts, to personalize without repeating questions.
- A static fallback question bank exists for cases where the AI generation step fails or is delayed, so the daily notification never has a missing question.

## 10. Deployment

**Preferred approach: manual deployment** — SSH into the VM, pull latest code, restart the process. Simple, full control, no extra tooling required to get started.

Other options considered, for later if manual becomes a bottleneck:

| Option | Notes |
|---|---|
| Deploy script | A single shell script on the VM doing pull + install + restart, still manually triggered. Low-effort upgrade from fully manual. |
| Process manager + systemd | Not a deploy method itself — ensures the API server restarts automatically on crash or VM reboot. Recommended regardless of deploy method, for reliability. |
| Git-triggered CI/CD | Push-to-deploy via a CI pipeline (e.g. GitHub Actions over SSH). More setup, but removes manual steps and is a strong portfolio signal. |
| Containerized deployment | Docker/docker-compose for the API server (and optionally Postgres). Consistent environments, easier to extend later. |

## 11. Non-Functional Requirements

- **Reliability:** the daily notification must fire even if AI generation for that day fails (fallback bank covers this).
- **Security:** SSH key-based access only on the VM, firewall restricting open ports, secrets (AI API key, DB credentials) kept in environment variables and never committed or shipped in the client.
- **Data durability:** media files in object storage, database backed up separately from the VM itself.
- **HTTPS required end-to-end** (needed for OAuth callback and general good practice).

## 12. Build Roadmap

1. **Core loop** — Push notification → static/simple AI question → text-only answer → basic timeline. Prove the daily habit loop before adding complexity.
2. **Media answers** — Add photo and voice note support, backed by object storage.
3. **AI question pipeline** — Move to scheduled server-side generation via Claude Haiku 4.5, batched a few days ahead, with a static fallback bank.
4. **Personalization** — Feed recent theme summaries + past question list into generation to personalize and avoid repeats.
5. **Day-365 experience (v2)** — Build the shareable recap/yearbook once the core loop is proven with real usage data.

## 13. Open Questions

- Exact Oracle Cloud instance shape/region and free-tier eligibility — to confirm at provisioning time.
- Whether to containerize now or defer that to a later iteration.
- Specific Flutter packages for push notifications, audio recording, and image capture — not yet selected; verify current, well-maintained options on pub.dev when implementation starts.

---

*Draft PRD — items above marked as unconfirmed or "to verify" are placeholders and should be finalized before implementation.*
