# 365 (Memory Bank)

> One question a day. 365 days. An AI-curated digital vault of who you were in text, voice, and photography.

---

## System Architecture

```
                                      ┌────────────────────────────────────────────────────────┐
                                      │                      User Devices                      │
                                      │            (PWA, Web Browser, Mobile View)             │
                                      └───────────────────────────┬────────────────────────────┘
                                                                  │
                                                           HTTPS (Port 443)
                                                                  ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                          Reverse Proxy & Gateway (Nginx / Cloudflare)                                        │
├──────────────────────────────────────────────────────┬───────────────────────────────────────────────────────────────────────┤
│    location / (Static SPA Assets)                    │    location /api/ (REST Proxy)                                        │
│    • Vite React PWA bundle (HTML, JS, CSS)           │    • FastAPI + Uvicorn Application Server                             │
│    • Service Worker (sw.js) & Web App Manifest       │    • JWT & Google OIDC Auth Exchange                                  │
│    • 1-Year Cache-Control on immutable /assets/      │    • 30MB Body Limit (Voice Recordings & Photos)                      │
└──────────────────────────┬───────────────────────────┴──────────────────────────────────┬────────────────────────────────────┘
                           │                                                              │
                           ▼                                                              ▼
             ┌───────────────────────────┐                                  ┌───────────────────────────┐
             │     Client Container      │                                  │       API Container       │
             │   (Nginx Static Host)     │                                  │    (FastAPI + Uvicorn)    │
             └───────────────────────────┘                                  └─────────────┬─────────────┘
                                                                                          │
                                ┌─────────────────────────────────────────────────────────┼────────────────────────────────────────┐
                                │                                                         │                                        │
                                ▼                                                         ▼                                        ▼
                  ┌───────────────────────────┐                             ┌───────────────────────────┐            ┌───────────────────────────┐
                  │    PostgreSQL 16 Database │                             │    S3 / Cloud Storage     │            │    Caching Layer (v1)     │
                  │   • Users & Streaks       │                             │   • Photos & Snapshots    │            │   • In-Memory Thread-Safe │
                  │   • Questions (365 Days)  │                             │   • Voice Audio Notes     │            │   • Keyed by Day+Interest │
                  │   • Answers & Reflections │                             │   • Local Fallback Mount  │            │   • Deduplicates LLM calls│
                  │   • Notification Logs     │                             └───────────────────────────┘            └───────────────────────────┘
                  │   • GIN FTS & Trigram idx │
                  └─────────────▲─────────────┘
                                │
                                └─────────────────────────────────┐
                                                                  │
                                                    ┌─────────────┴─────────────┐
                                                    │  Notification Engine (v1) │
                                                    │  • APScheduler In-Process │
                                                    │  • Hourly Timezone Cron   │
                                                    │  • 3:00 AM AI Batch Gen   │
                                                    │  • FCM / Push Dispatcher  │
                                                    └───────────────────────────┘
```

### Component Flow Overview

```mermaid
flowchart TD
    subgraph Client["Frontend Client (PWA)"]
        UI["React 19 + Vite UI"]
        SW["Service Worker (PWA Offline)"]
        MediaRec["MediaRecorder (WebM/MP4)"]
    end

    subgraph API["FastAPI Backend Server"]
        Router["API Router (/api)"]
        AuthMiddleware["JWT & Google OIDC Auth"]
        CacheV1["In-Memory Cache (v1)"]
        SchedulerV1["APScheduler Engine (v1)"]
    end

    subgraph Storage["Data & Object Persistence"]
        PG[("PostgreSQL 16 Engine")]
        S3["AWS S3 / Local Media Fallback"]
        Claude["Anthropic Claude Haiku API"]
        FCM["Firebase Cloud Messaging (FCM)"]
    end

    UI -->|REST HTTPS| Router
    Router --> AuthMiddleware
    Router -->|Check cached daily prompt| CacheV1
    CacheV1 -.->|Cache Miss| Claude
    Router -->|Read/Write Entities| PG
    MediaRec -->|Upload Audio/Photo| S3
    SchedulerV1 -->|Hourly Timezone Check| PG
    SchedulerV1 -->|Dispatch Reminders| FCM
    SchedulerV1 -->|Nightly Generation| Claude
```

---

## Features

- **AI-Curated Daily Journal Prompts:**
  - One unique, personalized question every day for 365 days generated by Anthropic Claude 3.5 Haiku.
  - Topics adapt dynamically to user-selected interest profiles: *mindfulness*, *gratitude*, *growth*, *creativity*, *relationships*, and *resilience*.
  - Strict cycle deduplication ensures questions never repeat over the 365-day journey.

- **Multi-Modal Memory Journaling:**
  - **Text Reflections:** Rich, auto-saving vintage diary entry editor.
  - **Voice Notes:** Cross-platform audio recorder (WebM on Chrome/Firefox, MP4/AAC on Safari/iOS) with real-time waveform visualizer canvas, instant zero-latency local playback, and server upload.
  - **Photo Attachments:** Visual snapshots saved directly to AWS S3 / Cloudflare R2 with automatic local filesystem fallback.

- **Vintage Editorial Typography & Aesthetics:**
  - Carefully crafted calligraphic editorial design using *Instrument Serif* italic headers, *Playfair Display* accents, *Lora* literary body text, and warm natural parchment color palettes (`#f6f4ee` and `#fffdf8`).

- **365 Calendar Matrix & Timeline Vault:**
  - Visual 365-day interactive calendar grid displaying journal completion states, format indicators (text/photo/voice), current streaks, and historical completion percentage.
  - Interactive timeline with PostgreSQL full-text search (`tsvector`) and fuzzy tag search via `pg_trgm` GIN indexes.
  - "On This Day" anniversary throwback banner surfacing past reflections.

- **Dual Authentication Modes:**
  - **Google One-Tap / Sign-In with Google:** Native Google Identity Services OIDC ID Token validation.
  - **Email & Password Authentication:** Secure password hashing with `bcrypt` and signed HS256 JWT access tokens.
  - **Instant Guest / Demo Exploration:** 1-click sandboxed walkthrough without sign-up friction.

- **Intelligent Caching Layer (v1):**
  - Thread-safe in-memory caching module (`server/app/cache.py`) keying questions by `daily_q:<interest>:<date>`.
  - All users sharing the same interest category on a given calendar day share identical cached prompt responses, avoiding costly duplicate LLM invocations and adhering to a strict midnight UTC expiration policy.

- **Automated Notification Engine (v1):**
  - Built-in `APScheduler` background cron engine running two core tasks:
    1. **Hourly Local Timezone Dispatcher:** Evaluates users' local timezone clocks and dispatches reminder notifications at their exact configured journaling hour (`preferred_journaling_time`).
    2. **Nightly Batch Generator:** Automatically pre-generates prompts at 3:00 AM UTC for the upcoming day.
  - Firebase Cloud Messaging (FCM) integration with persistent database logging in `notification_logs`.

---

## Usage

### 1. Authenticating
Users can register or sign in using three methods:
- **Google Sign-In:** Click **"Continue with Google"** to trigger the Google Identity Services popup and authenticate via OIDC ID Token.
- **Email & Password:** Toggle between **Sign In** and **Create Account** to register with standard credentials.
- **Demo Mode:** Click **"Explore with demo account"** to immediately access the interface seeded with sample memories and active streak counters.

### 2. Answering the Daily Question
1. Navigate to the **Today** tab.
2. Read the day's curated question prompt.
3. Express your reflection using any combination of formats:
   - Type your journal entry into the reflection area.
   - Click **Record Voice Note** to capture a voice recording. Watch the real-time canvas waveform and click **Play Voice** to review your recording.
   - Click **Attach Photo** to upload a visual memory.
4. Click **Save Today's Memory**. Once saved, a celebration modal displays your current streak milestone.

### 3. Reviewing the Timeline & Searching Past Memories
- Switch to the **Timeline** tab to view your chronological memory feed.
- Filter by media format (**All**, **Text**, **Voice**, **Photos**).
- Filter by themes or use the real-time search bar to search through past journal entries via PostgreSQL full-text search.
- Click any entry card to open the **Memory Detail Modal** for full playback, photo viewing, or editing.

### 4. Viewing the 365-Day Calendar Grid
- Switch to the **Calendar** tab to view your full 365-day journey matrix.
- Hover over or tap any day to preview that day's prompt, answer status, and captured formats.
- View real-time statistics including current streak, longest streak, and total memories captured.

### 5. Configuring Personal Preferences
- Click the **Settings (gear icon)** in the top navigation bar.
- Update your **Timezone** (e.g. `America/New_York`, `Asia/Kolkata`, `Europe/London`).
- Set your **Daily Reflection Time** (e.g. `20:00` / 8:00 PM).
- Select your active **Reflective Interests** (e.g. *Mindfulness*, *Gratitude*, *Creativity*).

---

## API Reference

All backend REST endpoints are prefixed with `/api`. Interactive OpenAPI documentation is accessible at `/api/docs`.

### Authentication (`/api/auth`)
| Method | Endpoint | Description | Request Body / Parameters |
|---|---|---|---|
| `POST` | `/api/auth/register` | Register a new user with password | `{ "email": str, "password": str, "name": str }` |
| `POST` | `/api/auth/login` | Authenticate with email and password | `{ "email": str, "password": str }` |
| `POST` | `/api/auth/google` | Authenticate via Google OIDC ID token | `{ "credential": str }` |
| `POST` | `/api/auth/demo` | Authenticate as sandboxed demo user | `{ "email": str, "name": str }` |
| `GET` | `/api/auth/me` | Retrieve profile of authenticated user | *Bearer JWT Header* |

### Daily Questions (`/api/questions`)
| Method | Endpoint | Description | Request Body / Parameters |
|---|---|---|---|
| `GET` | `/api/questions/today` | Fetch current day's active question & answer | *Bearer JWT Header* |
| `GET` | `/api/questions/{day_number}` | Fetch question by day number (1–365) | Path param: `day_number` (int) |
| `GET` | `/api/questions` | List all questions with pagination | Query: `limit`, `offset` |
| `POST` | `/api/questions/regenerate` | Force AI regeneration of today's question | *Bearer JWT Header* |

### Answers & Reflections (`/api/answers`)
| Method | Endpoint | Description | Request Body / Parameters |
|---|---|---|---|
| `POST` | `/api/answers` | Submit or update daily answer | `{ "question_id": int, "text": str?, "photo_url": str?, "audio_url": str? }` |
| `GET` | `/api/answers/{id}` | Retrieve memory answer by ID | Path param: `id` (int) |
| `PUT` | `/api/answers/{id}` | Update reflection text or media | `{ "text": str?, "photo_url": str?, "audio_url": str? }` |
| `DELETE` | `/api/answers/{id}` | Delete a specific answer | Path param: `id` (int) |
| `POST` | `/api/answers/upload-photo` | Upload photo (JPEG, PNG, WebP, HEIC) | `multipart/form-data` (`file`) |
| `POST` | `/api/answers/upload-voice` | Upload voice note (WebM, MP4, WAV, M4A) | `multipart/form-data` (`file`) |

### Timeline & Calendar (`/api/timeline`)
| Method | Endpoint | Description | Request Body / Parameters |
|---|---|---|---|
| `GET` | `/api/timeline` | Paginated feed of reflections with search | Query: `page`, `limit`, `format`, `theme`, `search` |
| `GET` | `/api/timeline/calendar` | 365-day grid state with streak metrics | *Bearer JWT Header* |

### User Settings (`/api/users`)
| Method | Endpoint | Description | Request Body / Parameters |
|---|---|---|---|
| `PUT` | `/api/users/preferences` | Update timezone, reminder time, & interests | `{ "timezone": str, "preferred_journaling_time": str, "interests": list }` |
| `POST` | `/api/users/push-token` | Register FCM push device token | `{ "push_token": str }` |

### Media Management (`/api/media`)
| Method | Endpoint | Description | Request Body / Parameters |
|---|---|---|---|
| `POST` | `/api/media/presign-upload` | Generate direct-to-S3 presigned PUT URL | `{ "filename": str, "content_type": str, "media_type": str }` |
| `GET` | `/api/media/{filename}` | Stream locally stored photo/audio file | Static media fallback |

---

## Configuration

### Backend Environment Variables (`server/.env`)

```ini
# Application Settings
PROJECT_NAME="365 Journal API"
ENVIRONMENT=production
DEBUG=False
PORT=8000

# Database (PostgreSQL 16 recommended)
DATABASE_URL=postgresql://memory_user:super_secret_password@localhost:5432/memory_bank

# JWT Security
JWT_SECRET=replace_with_secure_64_character_hex_secret
JWT_ALGORITHM=HS256
JWT_EXPIRATION_DAYS=30

# Google OAuth 2.0 (From Google Cloud Console)
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Anthropic Claude API (Daily Question Curation)
ANTHROPIC_API_KEY=sk-ant-api03-...
CLAUDE_MODEL=claude-haiku-4-5-20251001

# S3-Compatible Object Storage (AWS S3 or Cloudflare R2)
# If omitted, media falls back automatically to the local server /uploads directory
S3_ENDPOINT_URL=
S3_ACCESS_KEY=your_aws_or_r2_access_key
S3_SECRET_KEY=your_aws_or_r2_secret_key
S3_BUCKET_NAME=memory-bank-media
S3_REGION_NAME=us-east-1

# Firebase Cloud Messaging (Push Notifications)
FIREBASE_CREDENTIALS_PATH=serviceAccountKey.json
```

### Frontend Environment Variables (`client/.env.production`)

```ini
# Production API Base URL (leave /api for same-domain or Docker deployments)
VITE_API_BASE=https://api-memorybank.onrender.com/api

# Google Identity Services Client ID
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

---

## Roadmap

### Current Version (v1 — Completed)
- [x] Full-stack 365 daily journaling workflow with text, voice notes, and photo attachments.
- [x] In-memory thread-safe question caching layer (`daily_q:<interest>:<date>`).
- [x] Timezone-aware hourly notification engine via `APScheduler` and Firebase Cloud Messaging.
- [x] Google Identity Services (OIDC ID Token) + Email/Password + Demo login.
- [x] Timeline with PostgreSQL full-text search (`tsvector`) and trigram fuzzy matching (`pg_trgm`).
- [x] Cross-platform voice recording and playback supporting both WebM (Chrome/Firefox) and MP4/M4A (Safari/iOS).
- [x] Containerized multi-service Docker Compose deployment.

### Upcoming Version (v2 — Planned Enhancements)
- [ ] **Distributed Redis Caching Layer:**
  - Transition from in-memory dictionary to standalone Redis 7 service.
  - Cross-worker cache sharing across multi-worker Uvicorn processes and multi-container deployments.
  - Cached timeline queries and user streak calculations with tag-based cache invalidation.
- [ ] **Decoupled Notification & Scheduler Worker:**
  - Separate background scheduler into a dedicated worker container to avoid duplicate cron execution in multi-worker web environments.
  - Real browser Web Push (VAPID) service worker subscription handling with background push banner clicks.
  - Multi-channel notification support including transactional email reminders (Resend / AWS SES).
- [ ] **API Protection & Rate Limiting:**
  - Redis-backed rate limiting (`slowapi`) protecting authentication and Anthropic LLM routes against brute-force attacks and budget exhaustion.
- [ ] **Media Streaming Enhancements:**
  - Native HTTP 206 Partial Content (Range requests) streaming support for seamless audio scrubbing and seeking.
- [ ] **Production Observability & CI/CD:**
  - Sentry APM integration for automated exception alerting on client and server.
  - GitHub Actions automated CI/CD pipeline for unit tests, migration checks, and container builds.

---

## Running Tests

### Backend Unit & Integration Tests

The test suite validates authentication, question generation fallback banks, timeline filtering, answer submissions, and timezone calculation logic.

1. Navigate to the `server` directory and activate the virtual environment:
   ```bash
   cd server
   source venv/bin/activate
   ```

2. Run the main API test suite:
   ```bash
   PYTHONPATH=. python tests/test_api.py
   ```

3. Run the exhaustive connection and constraint validation suite:
   ```bash
   PYTHONPATH=. python tests/test_api_exhaustive.py
   ```

4. Run the merge and database operations test:
   ```bash
   PYTHONPATH=. python tests/test_merge_and_ops.py
   ```

### Database Migration Verification (Alembic)

Verify that Alembic migrations generate clean PostgreSQL DDL offline without executing against a live database:
```bash
cd server
DATABASE_URL="postgresql://user:pass@localhost:5432/db" PYTHONPATH=. alembic upgrade head --sql
```

### Frontend Build & Lint Verification

Verify that the client PWA builds and compiles without syntax, styling, or asset bundling errors:
```bash
cd client
npm run build
```

---

## Deployment

### Option A: Docker Compose (Recommended for Full-Stack)

Docker Compose encapsulates PostgreSQL 16, the FastAPI backend, and the Nginx frontend static host.

1. Configure production environment variables:
   ```bash
   cp .env.production.example server/.env
   ```

2. Launch all services in detached mode:
   ```bash
   docker compose up -d --build
   ```

3. Verify running container health:
   ```bash
   docker compose ps
   ```

4. Check migration and API logs:
   ```bash
   docker compose logs -f api
   ```

### Option B: Cloud PaaS (Render / Vercel / Cloudflare)

| Tier | Recommended Platform | Configuration Settings |
|---|---|---|
| **Backend API** | Render / Railway / Fly.io | • **Root Directory:** `server`<br>• **Environment:** Python 3.13<br>• **Build Command:** `pip install -r requirements.txt && alembic upgrade head`<br>• **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| **Frontend PWA** | Vercel / Cloudflare Pages | • **Root Directory:** `client`<br>• **Framework Preset:** Vite<br>• **Build Command:** `npm run build`<br>• **Output Directory:** `dist`<br>• **Environment Variable:** `VITE_API_BASE=https://<your-backend-render-app>/api` |
| **Database** | Neon.tech / Supabase / Render Postgres | • PostgreSQL 16 managed instance<br>• Copy connection string into backend `DATABASE_URL` |
| **Object Storage** | AWS S3 / Cloudflare R2 | • Create bucket with CORS enabled for your frontend domain<br>• Provide IAM credentials in backend environment |

### Option C: Bare-Metal / Ubuntu VPS (Systemd + Nginx)

1. Clone code to `/var/www/memory-bank`:
   ```bash
   git clone https://github.com/your-username/memory-bank.git /var/www/memory-bank
   ```

2. Configure backend virtual environment & database migrations:
   ```bash
   cd /var/www/memory-bank/server
   python3.13 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   PYTHONPATH=. alembic upgrade head
   ```

3. Configure systemd unit (`/etc/systemd/system/memorybank.service`):
   ```ini
   [Unit]
   Description=365 Memory Bank FastAPI Backend Service
   After=network.target postgresql.service

   [Service]
   Type=simple
   User=www-data
   WorkingDirectory=/var/www/memory-bank/server
   EnvironmentFile=/var/www/memory-bank/server/.env
   Environment="PYTHONPATH=/var/www/memory-bank/server"
   ExecStart=/var/www/memory-bank/server/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 3
   Restart=always

   [Install]
   WantedBy=multi-user.target
   ```

4. Build frontend PWA and serve via Nginx:
   ```bash
   cd /var/www/memory-bank/client
   npm ci
   npm run build
   ```
