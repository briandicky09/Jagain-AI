# JAGAIN AI — Production Deployment & Operations Guide

## 1. Architecture Summary

JAGAIN consists of two independently deployable runtimes:
1. **Laravel 13 + Inertia/React 19 Web Application** (Vercel serverless via `vercel.json` + `api/index.php`, or standard PHP 8.3+ FPM host)
2. **Python 3.11 FastAPI AI Microservice** (`ai-service/`, containerized via `ai-service/Dockerfile` and `docker-compose.ai.yml`)

> [!IMPORTANT]
> Never embed secrets in `vercel.json`, `docker-compose.ai.yml`, `ai-service/Dockerfile`, or `VITE_*` frontend variables. Inject all secrets exclusively via your hosting secret manager or un-tracked runtime `.env` files.

---

## 2. Required Environment Variables & Secret Generation

Generate fresh, high-entropy secrets before deploying:

```bash
# 1. Laravel APP_KEY
php artisan key:generate --show

# 2. Shared internal secret for Laravel <-> FastAPI authentication (>= 32 chars required in production)
openssl rand -hex 32
```

### Laravel Production Environment Variables (Vercel / Server)

| Variable | Required Value / Notes |
|---|---|
| `APP_ENV` | `production` |
| `APP_DEBUG` | `false` |
| `DEV_AUTO_LOGIN` | `false` |
| `APP_KEY` | Output of `php artisan key:generate --show` (freshly rotated) |
| `APP_URL` | Canonical HTTPS URL (e.g. `https://jagain.example.org`) |
| `SESSION_SECURE_COOKIE` | `true` |
| `SESSION_ENCRYPT` | `true` |
| `DB_CONNECTION` | `pgsql` |
| `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`, `DB_SSLMODE` | PostgreSQL / Supabase connection credentials (use rotated password) |
| `AI_SERVICE_ENABLED` | `true` |
| `AI_SERVICE_URL` | Internal/private TLS URL of the `ai-service` container (never expose unproxied to browsers) |
| `AI_SERVICE_SECRET` | Identical 32+ char secret from `openssl rand -hex 32` |

### FastAPI AI Service Environment Variables (`ai-service/.env` / Container Env)

| Variable | Required Value / Notes |
|---|---|
| `AI_ENV` | `production` |
| `AI_LOG_LEVEL` | `INFO` |
| `AI_SERVICE_SECRET` | Identical 32+ char secret (startup refuses default or `<32` char secrets when `AI_ENV=production`) |
| `AI_EMBEDDING_BACKEND` | `sentence_transformer` |
| `AI_VISION_BACKEND` | `clip` (or `siglip`) |
| `AI_PRELOAD_MODELS` | `true` |
| `AI_MAX_IMAGE_BYTES` | `5242880` (5 MB) |
| `AI_MAX_REQUEST_BYTES` | `10485760` (10 MB) |
| `AI_RATE_LIMIT_PER_MINUTE` | `120` |

---

## 3. Deploying the AI Microservice with Docker

### Host Requirements
- **CPU:** >= 2 vCPU
- **RAM:** >= 2 GB (for CPU PyTorch + `paraphrase-multilingual-MiniLM-L12-v2` + `openai/clip-vit-base-patch32`)
- **Storage:** Persistent volume for Hugging Face model cache (`ai_hf_cache:/app/.cache/huggingface`)

### Security Hardening Included in `ai-service/Dockerfile` & `docker-compose.ai.yml`
- Multi-stage build using `ai-service/requirements-prod.txt` (excludes `pytest`/`ruff`) and `ai-service/.dockerignore` (excludes `.env*`, `.venv`, tests).
- Runs as non-root `appuser` (`uid 10001`).
- Read-only root filesystem (`read_only: true`) with ephemeral `/tmp` tmpfs, `no-new-privileges:true`, `cap_drop: [ALL]`, and `pids_limit: 256`.
- Binds `127.0.0.1:8001` by default (place behind an authenticated internal network or TLS reverse proxy if Laravel runs on another host).
- Built-in container `HEALTHCHECK` against `/api/v1/health`.

### Build & Startup Commands

```bash
# Export or load AI_SERVICE_SECRET in your deployment shell / .env
export AI_SERVICE_SECRET="$(openssl rand -hex 32)"

# Build and start the hardened AI microservice
docker compose -f docker-compose.ai.yml up -d --build

# Inspect container health and startup logs
docker compose -f docker-compose.ai.yml ps
docker compose -f docker-compose.ai.yml logs -f ai-service
```

---

## 4. Deploying the Laravel Application

1. Patch PHP dependency advisories in an online CI/build environment and run tests:
   ```bash
   composer update --with-dependencies
   composer audit
   php artisan test
   ```
2. Build production frontend assets:
   ```bash
   npm ci --omit=dev
   npm run build
   ```
3. Run database migrations against PostgreSQL:
   ```bash
   php artisan migrate --force
   ```
4. For Vercel deployments, configure all secrets in the Vercel Project Environment Variables UI and deploy (`vercel --prod`). Never store database credentials or `APP_KEY` in `vercel.json`.

---

## 5. Post-Deployment Smoke Checks

```bash
# Public minimal health probe (returns ok + restricted metadata without auth)
curl -sS https://your-ai-host/api/v1/health

# Authenticated diagnostics check (must use the shared secret)
curl -sS -H "X-AI-Service-Secret: ${AI_SERVICE_SECRET}" https://your-ai-host/api/v1/health/diagnostics

# Confirm Swagger docs are disabled in production (must return 404)
curl -i https://your-ai-host/docs
```
