# 365 (Memory Bank) — Full Stack Audit & Master Implementation Roadmap

**Project:** 365 / Memory Bank  
**Architecture:** FastAPI (Python 3.13) + PostgreSQL + Redis (Planned) + AWS S3/Object Storage + Firebase Cloud Messaging + React 19/PWA  
**Status:** Alpha Prototype / Partial Backend MVP & Prototype Client  

---

## 1. Executive Summary: What is Done vs. What is Left

The **365 (Memory Bank)** project is envisioned as an intimate, AI-curated daily journaling habit platform. Each day for 365 days, a user receives one reflective prompt, responds via text, photo, or voice note, and progressively builds an archival timeline of their year.

### High-Level Status Matrix

| System Component | Current Implementation Status | Production Readiness | Primary Deficits |
|---|---|---|---|
| **Database** | Partial (SQLAlchemy models + raw SQL schema + test seed) | ⚠️ Needs Remediation | Model/DDL constraint drift, no Alembic migrations, missing timezone support, no indexes for search. |
| **Backend API** | Functional Core (FastAPI, Auth, Q&A, Timeline, Storage) | ⚠️ Needs Hardening | Unauthenticated dev-user fallback vulnerability, day advancement calendar logic bug, synchronous proxy uploads, no pagination. |
| **Caching Layer** | Non-Existent (0% implemented) | ❌ Missing | Zero Redis / memory caching; missing today's question cache, timeline cache, rate limiters, and CDN/HTTP headers. |
| **Notification Engine** | Partial (FCM wrapper + APScheduler crons) | ❌ Critical Bugs | Hourly cron spams ALL users regardless of chosen time preference or completion status; no timezone awareness; no web push. |
| **Frontend** | Basic Prototype (React 19 + Vite + inline styles) | 🔄 Requires Full Redo | Prop-drilled, no routing, auto-demo login, no offline sync, basic inline CSS, raw audio element, no calendar view. |
| **DevOps / Infra** | Minimal (local `.env`, manual tests) | ⚠️ Early Setup | No Docker/docker-compose, no CI/CD, no systemd unit files, missing PWA asset files. |

---

## 2. In-Depth Component Analysis

### 2.1 The Database (PostgreSQL & SQLAlchemy)

#### What is Done
1. **Schema DDL (`server/db/schema.sql` & `db/schema.sql`)**: Clean PostgreSQL DDL for three tables:
   - `users`: `id`, `google_id`, `email`, `name`, `avatar_url`, `notification_time_preference`, `push_token`, `created_at`.
   - `questions`: `id`, `user_id`, `day_number`, `question_text`, `theme_tags`, `generated_at`, `is_served`, with `CONSTRAINT uq_user_day_number UNIQUE (user_id, day_number)`.
   - `answers`: `id`, `question_id` (UNIQUE), `user_id`, `text`, `photo_url`, `audio_url`, `created_at`.
2. **SQLAlchemy Models (`server/app/models/`)**: Python ORM models reflecting tables with bidirectional relationships (`User.questions`, `User.answers`, `Question.answer`).
3. **Database Connectivity (`server/app/database.py`)**: `create_engine` with SQLite / PostgreSQL support (`psycopg2`), connection pool pinging, and `get_db` session dependency.
4. **Seed & Verification Script (`server/db/seed_and_test.sql`)**: Comprehensive idempotent seed script using `ON CONFLICT DO UPDATE`.

#### What is Left / Identified Deficits
1. **Schema vs. Model Drift**:
   - `uq_user_day_number UNIQUE(user_id, day_number)` exists in `schema.sql` but is **missing** from `server/app/models/question.py`. Table creation via `init_db()` omits this composite unique constraint, risking duplicate day entries per user.
   - Check constraint `CHECK (day_number BETWEEN 1 AND 365)` is missing from the SQLAlchemy model.
2. **Missing Database Migrations (Alembic)**:
   - `alembic` is in `requirements.txt`, but there is no `alembic.ini` or migration script directory. Schema updates currently cannot be versioned or applied automatically to production.
3. **Timezone Blindness**:
   - `created_at` in models uses deprecated `datetime.utcnow` (naive UTC) instead of timezone-aware UTC (`DateTime(timezone=True)` or `server_default=func.now()`).
   - The `users` table lacks a `timezone` column (e.g. `America/New_York`, `Asia/Kolkata`). Without it, calculating "today" and scheduling notifications at local 20:00 is mathematically impossible.
4. **Missing Supporting Entities**:
   - No `notification_logs` or `push_subscriptions` table to manage web push VAPID endpoints or track delivery history.
   - No `user_streaks` or streak metrics table (current streak, max streak, last active date).
5. **Missing Search & Performance Indexes**:
   - No GIN full-text search index on `answers.text` or PostgreSQL trigram (`pg_trgm`) index for theme tag searching.
   - Missing connection pool tuning parameters (`pool_size`, `max_overflow`, `pool_recycle`).

---

### 2.2 The Backend (FastAPI, Services & Business Logic)

#### What is Done
1. **REST API Structure (`server/app/routers/`)**:
   - `auth.py`: JWT generation, demo login (`/auth/demo`), Google ID token verification (`/auth/google`), user identity (`/auth/me`).
   - `questions.py`: Today's prompt (`/questions/today`), historical prompt (`/questions/{day_number}`).
   - `answers.py`: Submit/update response (`/answers`), photo upload (`/answers/upload-photo`), voice upload (`/answers/upload-voice`).
   - `timeline.py`: Aggregated memory list (`/timeline`).
   - `users.py`: User preferences (`/users/preferences`).
2. **AI Question Generator (`server/app/services/ai_generator.py`)**:
   - Integrates Anthropic Claude API (`claude-haiku-5-5` / `claude-haiku-4-5-20251001`).
   - Formats prompt with past question history and themes to prevent repetition.
   - Extracts output question and comma-separated theme tags.
3. **Static Fallback Bank (`server/app/services/fallback_bank.py`)**:
   - 50 pre-curated reflective questions ensuring high reliability if Anthropic is unavailable or throttled.
4. **Storage Service (`server/app/services/storage.py`)**:
   - Boto3 client supporting AWS S3 or Oracle Cloud S3-compatible Object Storage with fallback to local `uploads/` static directory.

#### What is Left / Identified Critical Flaws
1. **Critical Module Import Crash (`init_db()` in `main.py`)**:
   - `server/app/main.py:17` invokes `init_db()` at top-level import time. If PostgreSQL is offline or starting up, importing `app.main` instantly crashes the application before tests or mock environments can even initialize.
2. **Critical Auth Security Vulnerability (`get_current_user`)**:
   - `server/app/routers/auth.py` has a development fallback that automatically authenticates ANY unauthenticated request as the first user (`shiven@example.com`). In production, this would grant anonymous visitors unrestricted access to user data.
3. **Core Product Logic Bug (Instant Day Advancement)**:
   - In `/api/questions/today`, if the user has answered the last question, it **immediately** creates and serves tomorrow's question. A user can answer 365 questions in an afternoon, defeating the core 365-day habit premise. Questions must be locked to calendar days in the user's local timezone.
4. **Synchronous Proxy Media Uploads**:
   - Media uploads route raw bytes through FastAPI: Client → FastAPI server memory → S3. This consumes server RAM, ties up worker processes, and risks request timeouts.
   - **Fix:** Transition to S3 Pre-signed URLs (`PUT` direct to bucket).
5. **Missing File Validation**:
   - No maximum upload size limits (e.g. 10MB photo, 25MB voice).
   - Audio upload does not validate MIME type (allows arbitrary binary files).
   - Extensions are extracted naively via `os.path.splitext` without magic byte inspection.
6. **API Limitations**:
   - `/api/timeline` lacks pagination (`limit`, `offset` / `cursor`). Serving 365 items with media references in a single JSON payload will cause latency spikes.
   - No endpoints to delete or edit memories, search by date/theme, or export data.

---

### 2.3 The Caching Layer (0% Implemented)

#### What is Done
- **Nothing.** No Redis integration, no in-memory cache (`cachetools`), and no HTTP caching headers exist in the codebase.

#### What Needs to be Built
1. **Redis Service Integration**:
   - Add `redis>=5.0.0` or `redis[hiredis]` to `requirements.txt`.
   - Setup Redis connection pooling in `server/app/config.py` and lifespan management.
2. **Cache Targets & Patterns**:
   - **Today's Question (`user:{id}:today_q`)**: Cache today's prompt response for the day. Invalidate immediately upon answer submission.
   - **Timeline Cache (`user:{id}:timeline:page:{N}`)**: Cache paginated timeline chunks. Invalidate on answer creation/update/deletion.
   - **User Schedule Cache (`user:{id}:schedule`)**: Cache user notification hours and timezones so the notification dispatcher avoids database table scans every hour.
   - **AI Generation Distributed Lock (`lock:ai_gen:{user_id}`)**: Prevent race conditions if multiple client tabs hit `/questions/today` simultaneously.
   - **Rate Limiting**: Redis-backed rate limiting (`slowapi`) on auth, AI generation, and upload endpoints.
   - **HTTP Cache-Control**: Return `Cache-Control: public, max-age=31536000, immutable` for uploaded static media assets.

---

### 2.4 The Notification Engine

#### What is Done
1. **FCM Push Service (`server/app/services/push.py`)**:
   - Firebase Admin SDK initialization with graceful mock push logger fallback.
2. **APScheduler Background Jobs (`server/app/services/scheduler.py`)**:
   - `batch_generate_questions_job` (nightly at 03:00 AM).
   - `daily_notification_dispatcher` (hourly at minute 0).

#### What is Left / Critical Flaws Identified
1. **Severe Hourly Notification Spam Bug**:
   - In `server/app/services/scheduler.py:56-74`, the hourly dispatcher queries **ALL** users with a push token and sends a push notification **every single hour**, regardless of:
     - The user's `notification_time_preference` (completely ignored!).
     - Whether the user has already received the notification today.
     - Whether the user has already answered today's prompt!
2. **Zero Timezone Support**:
   - Storing `"20:00"` without a user timezone makes scheduling meaningless for users across different timezones.
3. **Web Push Protocol Missing**:
   - Web frontend currently relies on browser-local `new Notification()`. When the browser tab is closed, the user receives nothing.
   - Must implement true Web Push (VAPID / Service Worker `PushManager`) or Firebase Web SDK to register a real FCM web device token with the backend.
4. **Concurrency & Multiprocess Bottleneck**:
   - Running APScheduler inside a multi-worker Uvicorn process causes jobs to run N times (once per worker).
   - Needs a decoupled worker (e.g. Celery / ARQ with Redis) or APScheduler with `SQLAlchemyJobStore` and single-instance locking.
5. **Batch Dispatch**:
   - Migrate from sequential single-message `messaging.send()` to batch dispatch `messaging.send_each_for_multicast()` (up to 500 recipients per call).
   - Handle `UnregisteredError` to automatically purge stale device tokens.

---

### 2.5 The Frontend (Redo Plan)

#### Why the Current Frontend Must be Redone
The existing React prototype is an unrouted 4-component script with raw inline styles, an automatic demo login that prevents real user authentication, prop-drilled state without caching, plain textareas without autosave, and no calendar overview.

#### Target Architecture for Redone Frontend
1. **Modern Foundation**:
   - **Routing:** React Router v6 / TanStack Router (`/today`, `/timeline`, `/calendar`, `/memory/:day`, `/settings`, `/login`).
   - **Data Fetching & Cache:** TanStack Query (React Query) for caching, optimistic updates, and background refetching.
   - **Styling:** Bespoke Design System with clean CSS variables, glassmorphic obsidian aesthetic, and fluid typography.
   - **Animations:** Framer Motion for micro-interactions, page transitions, and celebratory milestone animations.
2. **Feature Set**:
   - **Auth Screen:** Google OAuth One-Tap + popup login, guest demo toggle, user avatar & profile menu.
   - **Today's Question Screen:**
     - Elegant day indicator ("Day 18 of 365") with theme tag badges.
     - Markdown-supported text reflection with character count & local draft autosave.
     - Audio recording studio: live waveform visualizer, pause/resume, playback scrubber.
     - Photo uploader: drag-and-drop, image preview, compression before upload.
     - Completion state: celebration animation, memory preview, "Edit Answer" toggle, and countdown to next day's prompt.
   - **Timeline & Memory Exploration**:
     - Dual-view toggle: Chronological Feed vs. **365 Calendar Heatmap** (visual annual grid showing answered, missed, and upcoming days).
     - Filter by format: All, Text, Photo, Voice.
     - Search with highlighted keyword matching and theme tag filtering.
     - "On This Day" / Flashback memories.
   - **Settings & Preferences**:
     - Time picker with local timezone auto-detection.
     - Native Web Push notification permission and token registration.
     - Export memory bank to JSON / Markdown / PDF.
   - **PWA & Offline Capability**:
     - Service worker with offline asset and API caching.
     - Offline reflection submission queued in IndexedDB and synchronized on reconnection.

---

## 3. Master To-Do List

### Phase 1: Database Hardening & Migrations
- [x] Initialize Alembic (`alembic init alembic`) and configure `env.py` to import SQLAlchemy models.
- [x] Synchronize `models/question.py` with `schema.sql`: add `UniqueConstraint('user_id', 'day_number', name='uq_user_day_number')` and check constraint.
- [x] Add `timezone` column (default `'UTC'`) to `User` model and database.
- [x] Add `streak_count`, `max_streak`, and `last_answered_at` to `User` model.
- [x] Create `notification_logs` table (`id`, `user_id`, `question_id`, `status`, `sent_at`) for delivery tracking.
- [x] Add PostgreSQL trigram (`pg_trgm`) / full-text index on `answers.text` and `questions.theme_tags`.
- [x] Generate and execute initial Alembic migration (`03504816da5a_initial_schema_with_timezone_and_indexes.py`).
- [x] Configure production SQLAlchemy pool settings (`pool_size=10`, `max_overflow=20`, `pool_recycle=1800`).

### Phase 2: Backend Logic, Security & Architecture
- [x] Remove module-level `init_db()` from `server/app/main.py:17` and retain it strictly within the lifespan context.
- [x] Fix Auth Security: remove the automatic `dev_user` fallback in `get_current_user`; enforce proper 401 Unauthorized for invalid/missing JWTs.
- [ ] Add Refresh Token flow and JWT revocation mechanism.
- [x] Fix Calendar Logic in `/questions/today`: calculate user local calendar date; prevent advancing to Day N+1 until tomorrow's date arrives.
- [x] Add Pre-signed S3 Upload endpoints (`POST /api/media/presign-upload`) for direct client-to-S3 uploads, bypassing the FastAPI server memory.
- [x] Add upload validation (enforce max sizes, audio/image MIME validation).
- [x] Add pagination (`page`, `limit`) and filter parameters (`format`, `theme`, `search`) to `GET /api/timeline`.
- [x] Implement CRUD endpoints: `GET /api/answers/{id}`, `PUT /api/answers/{id}`, `DELETE /api/answers/{id}`.
- [x] Implement data export endpoint (`GET /api/users/export`) returning full JSON/Markdown archive.
- [x] Write unit & integration tests covering all auth, question, and answer flows (`test_api_exhaustive.py`).

### Phase 3: Caching Infrastructure (Redis)
- [ ] Install `redis>=5.0.0` in `requirements.txt`.
- [ ] Create Redis client module (`server/app/redis.py`) with connection pool and graceful fallback when Redis is unreachable.
- [ ] Implement Today's Question Cache (`user:{id}:today_q`) with TTL until local midnight; invalidate on answer submit.
- [ ] Implement Timeline Cache (`user:{id}:timeline:{page}`) with invalidation on answer mutation.
- [ ] Implement User Notification Schedule Cache to support high-throughput notification checks.
- [ ] Implement Redis Distributed Lock (`lock:ai_gen:{user_id}`) to prevent duplicate concurrent Claude calls.
- [ ] Integrate `slowapi` or Redis-based rate limiting on `/auth/*`, `/questions/today`, and `/media/*`.
- [ ] Configure HTTP `Cache-Control` headers for all static media assets.

### Phase 4: Notification Engine Overhaul
- [ ] Overhaul `daily_notification_dispatcher` in `server/app/services/scheduler.py`:
  - Calculate current UTC time.
  - Query only users whose `(current_utc_time in user_timezone).hour == user.notification_time_preference.hour`.
  - Filter out users who have already received today's notification or already submitted today's answer.
- [ ] Implement Web Push support: generate VAPID keys, create endpoint `POST /api/users/web-push-subscription`.
- [ ] Migrate push dispatch to `messaging.send_each_for_multicast()` for batch efficiency.
- [ ] Log every dispatch to `notification_logs` table; handle `UnregisteredError` to purge stale push tokens.
- [ ] Decouple scheduler from web workers (or configure single-process worker flag / Celery/ARQ task queue).

### Phase 5: Complete Frontend Redo
- [ ] **Architecture & Tooling Setup**:
  - Install React Router v6, TanStack Query (@tanstack/react-query), Framer Motion, and Zod.
  - Configure central API client with Axios/Fetch interceptors for JWT token handling and 401 redirect.
  - Clean up PWA icons (`pwa-192x192.png`, `pwa-512x512.png`, `apple-touch-icon.png`) in `public/`.
- [ ] **Design System & Global Layout**:
  - Implement design tokens (obsidian dark palette, amber/indigo accents, typography with Instrument Serif + Inter).
  - Build responsive Navigation Shell (Top Header with Streak Counter, Day Progress Bar, and Profile Menu; Bottom Mobile Navigation bar).
- [ ] **Authentication Views**:
  - Dedicated Login & Signup page with Google OAuth button and "Explore Demo" sandbox mode.
  - User Profile & Preferences modal (timezone selection, delivery time picker, Web Push toggle).
- [ ] **Today's Prompt & Answer Studio**:
  - Hero prompt card with evocative typography and theme tags.
  - Multi-modal Answer Composer:
    - Text reflection with character/word counter and draft autosave to `localStorage`.
    - Interactive Voice Recorder with HTML5 Canvas audio waveform visualizer, recording timer, play/pause preview.
    - Drag-and-drop Photo uploader with preview and remove options.
  - Post-submission celebration with confetti & streak milestone animation.
  - "Answered" state showing the saved memory card with an "Edit Memory" toggle.
- [ ] **Timeline & 365 Calendar Heatmap**:
  - Tab 1: Chronological Feed with rich memory cards (embedded audio players, photo lightboxes, tag pills).
  - Tab 2: **365 Calendar Heatmap Grid** (visual matrix of 365 days colored by status: completed, skipped, today, upcoming).
  - Filter bar (format filter: text/photo/voice; theme tags) and instant search input.
  - "Throwback" memory card ("30 days ago you wrote...").
- [ ] **Offline & PWA Enhancements**:
  - Implement Service Worker caching for offline app shell and previous memories.
  - Offline answer queue in IndexedDB (write reflection on airplane mode, auto-sync when online).
  - Custom "Install 365 to Home Screen" banner.

### Phase 6: DevOps, Containerization & Production Deployment
- [ ] Create `Dockerfile` for FastAPI backend (multi-stage build with Python 3.13-slim).
- [ ] Create `Dockerfile` for React client (multi-stage build with Nginx reverse proxy).
- [ ] Create `docker-compose.yml` orchestrating:
  - `web`: Nginx serving client + proxying `/api`
  - `api`: FastAPI backend
  - `db`: PostgreSQL 16
  - `cache`: Redis 7
- [ ] Write VM deployment script (`deploy.sh`) for Oracle Cloud Always Free instance (pull, migrate, docker compose up -d).
- [ ] Configure SSL / HTTPS via Let's Encrypt / Certbot.
- [ ] Set up systemd service or Docker restart policies for continuous uptime.
