# 365 (Memory Bank) — Production Deployment Guide

This guide provides end-to-end instructions for deploying the **365 (Memory Bank)** application to production. It covers containerized deployment via Docker Compose, bare-metal VPS setup with systemd & Nginx, and cloud platform hosting (Render, Railway, Fly.io, Vercel).

---

## 1. System Architecture Overview

```
                                ┌───────────────────────────────────────┐
                                │             User Devices              │
                                │   (PWA, Web Browser, Mobile View)     │
                                └───────────────────┬───────────────────┘
                                                    │
                                             HTTPS (Port 443)
                                                    ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                          Reverse Proxy & Gateway (Nginx / Cloudflare)                   │
├───────────────────────────────────────────┬────────────────────────────────────────────┤
│   location / (Static Assets)              │   location /api/ (REST Proxy)              │
│   • HTML5, CSS, JS bundles                │   • JWT Auth, Questions, Answers, Timeline │
│   • PWA Service Worker (sw.js)            │   • Static Media Fallback (/api/media)     │
│   • 1-Year Cache-Control on /assets/      │   • Max Body Size: 30MB (Voice/Photos)     │
└─────────────────────┬─────────────────────┴───────────────────────┬────────────────────┘
                      │                                             │
                      ▼                                             ▼
        ┌───────────────────────────┐                 ┌───────────────────────────┐
        │       Client Container    │                 │       API Container       │
        │      (Nginx Static Host)  │                 │    (FastAPI + Uvicorn)    │
        └───────────────────────────┘                 └─────────────┬─────────────┘
                                                                    │
                                            ┌───────────────────────┴───────────────────────┐
                                            ▼                                               ▼
                              ┌───────────────────────────┐                   ┌───────────────────────────┐
                              │    PostgreSQL Database    │                   │     S3 / Cloud Storage    │
                              │   (Users, Q&A, Streaks)   │                   │   (Photos & Voice Notes)  │
                              └───────────────────────────┘                   └───────────────────────────┘
```

---

## 2. Prerequisites & Environment Setup

### Minimum Server Requirements
- **Hardware:** 1 vCPU, 2 GB RAM, 25 GB SSD (e.g. Hetzner CX22, DigitalOcean Basic, AWS t4g.small).
- **Operating System:** Ubuntu 22.04 LTS, Ubuntu 24.04 LTS, or Debian 12.
- **Network:** Public IP with ports `80` (HTTP) and `443` (HTTPS) open.

### Domain & DNS
Point your domain (e.g., `memorybank.yourdomain.com`) to your server's public IP address via an **A Record**.

---

## 3. Option A: 1-Click Deployment with Docker Compose (Recommended)

Docker Compose provides the simplest and most reproducible deployment, encapsulating PostgreSQL 16, the FastAPI backend, and the Nginx frontend.

### Step 1: Clone Repository
```bash
git clone https://github.com/your-username/memory-bank.git /opt/memory-bank
cd /opt/memory-bank
```

### Step 2: Configure Environment Variables
Copy the production environment example:
```bash
cp .env.production.example server/.env
```

Edit `server/.env` with your secure production values:
```bash
nano server/.env
```

Generate a secure 64-character JWT secret key:
```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

Set the generated secret as `JWT_SECRET` in `server/.env`. Configure your Anthropic API key and database credentials:
```env
ENVIRONMENT=production
DEBUG=False
PORT=80
PROJECT_NAME="365 Journal API"

POSTGRES_USER=memory_user
POSTGRES_PASSWORD=your_super_secure_postgres_password_here
POSTGRES_DB=memory_bank

JWT_SECRET=your_generated_64_character_hex_secret
ANTHROPIC_API_KEY=sk-ant-api03-...

# Optional S3 Storage (if omitted, media stores locally in docker volume)
S3_BUCKET_NAME=your-bucket-name
S3_ACCESS_KEY=your-access-key
S3_SECRET_KEY=your-secret-key
S3_REGION_NAME=us-east-1
```

### Step 3: Launch Containers
Run Docker Compose in detached mode with automatic build:
```bash
docker compose up -d --build
```

### Step 4: Verify Deployment Health
Check running container status:
```bash
docker compose ps
```

Verify that the database migrations ran automatically during startup:
```bash
docker compose logs -f api
```

Test the live API health endpoint:
```bash
curl -I http://localhost/api/
```
Expected output:
```http
HTTP/1.1 200 OK
content-type: application/json
```

---

## 4. Option B: Bare-Metal / VPS Systemd + Nginx Deployment

If you prefer running without Docker on an Ubuntu 22.04 / 24.04 LTS server:

### Step 1: Install System Dependencies
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y python3.13 python3.13-venv python3-pip postgresql postgresql-contrib nginx certbot python3-certbot-nginx git curl
```

Install Node.js 22 LTS (via NodeSource):
```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
```

### Step 2: Configure PostgreSQL
Log into PostgreSQL and create the production user and database:
```bash
sudo -u postgres psql
```
Execute SQL statements:
```sql
CREATE DATABASE memory_bank;
CREATE USER memory_user WITH ENCRYPTED PASSWORD 'your_strong_password_here';
GRANT ALL PRIVILEGES ON DATABASE memory_bank TO memory_user;
ALTER DATABASE memory_bank OWNER TO memory_user;
\q
```

### Step 3: Setup Backend Application
Create application directory and clone code:
```bash
sudo mkdir -p /var/www/memory-bank
sudo chown -R $USER:$USER /var/www/memory-bank
git clone https://github.com/your-username/memory-bank.git /var/www/memory-bank
cd /var/www/memory-bank/server
```

Create virtual environment and install packages:
```bash
python3.13 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

Create production configuration (`/var/www/memory-bank/server/.env`):
```bash
cp /var/www/memory-bank/.env.production.example /var/www/memory-bank/server/.env
nano /var/www/memory-bank/server/.env
```
Ensure `DATABASE_URL` is set to:
```env
DATABASE_URL=postgresql://memory_user:your_strong_password_here@localhost:5432/memory_bank
```

Run database migrations:
```bash
PYTHONPATH=. ./venv/bin/alembic upgrade head
```

### Step 4: Create Systemd Service for FastAPI
Create a systemd service file:
```bash
sudo nano /etc/systemd/system/memorybank.service
```

Paste the following unit configuration:
```ini
[Unit]
Description=365 Memory Bank FastAPI Backend Service
After=network.target postgresql.service

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/var/www/memory-bank/server
EnvironmentFile=/var/www/memory-bank/server/.env
Environment="PYTHONPATH=/var/www/memory-bank/server"
ExecStart=/var/www/memory-bank/server/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 3
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

Ensure permissions on uploads directory:
```bash
sudo mkdir -p /var/www/memory-bank/server/uploads
sudo chown -R www-data:www-data /var/www/memory-bank/server
```

Enable and start service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable memorybank.service
sudo systemctl start memorybank.service
sudo systemctl status memorybank.service
```

### Step 5: Build Frontend PWA
Navigate to the client directory and build static distribution files:
```bash
cd /var/www/memory-bank/client
npm ci
npm run build
```
This outputs static assets to `/var/www/memory-bank/client/dist`.

### Step 6: Configure Nginx & SSL
Create an Nginx server block:
```bash
sudo nano /etc/nginx/sites-available/memorybank
```

Paste the following Nginx configuration:
```nginx
server {
    listen 80;
    server_name memorybank.yourdomain.com;

    root /var/www/memory-bank/client/dist;
    index index.html;

    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/javascript application/javascript application/json image/svg+xml;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # API Reverse Proxy
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 30M;
    }

    # Static Assets Cache (Vite hash files)
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # SPA Fallback
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Enable the site and reload Nginx:
```bash
sudo ln -sf /etc/nginx/sites-available/memorybank /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

Obtain a free Let's Encrypt SSL certificate:
```bash
sudo certbot --nginx -d memorybank.yourdomain.com
```

---

## 5. Option C: Cloud PaaS Deployment (Serverless / Managed)

For a zero-server-maintenance setup:

| Tier | Service | Configuration |
|---|---|---|
| **Frontend** | Vercel or Cloudflare Pages | Root Directory: `client`<br>Build Command: `npm run build`<br>Output Directory: `dist` |
| **Backend** | Render, Railway, or Fly.io | Root Directory: `server`<br>Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`<br>Runtime: Python 3.13 |
| **Database** | Neon.tech or Supabase | PostgreSQL 16 serverless instance. Copy Connection String to `DATABASE_URL`. |
| **Storage** | AWS S3 or Cloudflare R2 | S3-compatible Object Storage for uploaded media. |

### Client-side API Proxy Configuration
When deploying frontend and backend to separate domains (e.g. `memorybank.vercel.app` and `api-memorybank.onrender.com`), create a `client/.env.production` file:
```env
VITE_API_BASE=https://api-memorybank.onrender.com/api
```
Update `server/app/main.py` CORS origins to include your production frontend domain:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://memorybank.yourdomain.com", "https://memorybank.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## 6. S3 / Cloudflare R2 Object Storage Setup

To store photos and voice notes securely in the cloud:

### 1. Create S3 Bucket
- Name: `memory-bank-media-production`
- Region: Choose your preferred region (e.g., `us-east-1` or `eu-central-1`)
- Block Public Access: Enable (bucket should remain private)

### 2. Configure CORS Policy
Set the bucket CORS policy in AWS S3 or Cloudflare R2 Console:
```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "HEAD"],
    "AllowedOrigins": ["https://memorybank.yourdomain.com"],
    "ExposeHeaders": ["ETag"]
  }
]
```

### 3. Least-Privilege IAM User Policy
Attach this policy to the dedicated IAM user for 365:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::memory-bank-media-production/*"
    }
  ]
}
```

---

## 7. Automated Backups & Disaster Recovery

Create an automated daily backup script to preserve reflections:
```bash
sudo nano /usr/local/bin/backup_memorybank.sh
```

Paste script:
```bash
#!/bin/bash
set -e

BACKUP_DIR="/var/backups/memorybank"
DATE=$(date +"%Y%m%d_%H%M%S")
FILENAME="memory_bank_db_${DATE}.sql.gz"

mkdir -p $BACKUP_DIR
pg_dump -U memory_user -h localhost memory_bank | gzip > "${BACKUP_DIR}/${FILENAME}"

# Optional: Sync to offsite S3 backup
# aws s3 cp "${BACKUP_DIR}/${FILENAME}" s3://your-backup-bucket/db/

# Keep only last 14 daily backups locally
find $BACKUP_DIR -name "*.sql.gz" -mtime +14 -exec rm {} \;

echo "Backup ${FILENAME} completed successfully."
```

Make executable and add to root crontab:
```bash
sudo chmod +x /usr/local/bin/backup_memorybank.sh
sudo crontab -e
```
Add line to run nightly at 2:30 AM:
```cron
30 2 * * * /usr/local/bin/backup_memorybank.sh >> /var/log/memorybank_backup.log 2>&1
```

---

## 8. Verification & Health Monitoring Checklist

After deployment, perform this 5-point verification:

- [ ] **Health Endpoint:** `curl -s https://memorybank.yourdomain.com/api/` returns `{"status":"healthy"}`.
- [ ] **Auth Flow:** Access `https://memorybank.yourdomain.com`, sign in via Demo account or Google OAuth, or register with email/password.
- [ ] **Reflection Submission:** Answer today's question with text, voice, and photo. Verify HTTP 201 response and confetti burst.
- [ ] **365 Grid Matrix:** Navigate to `365 Grid` tab and confirm day cell reflects completed format in warm pastel beige/sage palette.
- [ ] **Archive Export:** Navigate to `Settings` and click `Export JSON`. Verify that `memory_bank_archive_<date>.json` downloads with full memory records.
