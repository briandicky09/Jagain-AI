# JAGAIN AI — Architecture Specification

## 1. Architectural Overview

JAGAIN AI upgrades the existing Laravel 13 + Inertia/React 19 JAGAIN platform by introducing an **independent Python FastAPI AI microservice** (`ai-service/`) alongside a fault-tolerant Laravel integration layer.

**Core separation of concerns:**
- **Laravel (Primary Business Backend):** Remains solely responsible for authentication, RBAC + object-level authorization (`ReportPolicy`, `AssignmentPolicy`), official status state machines (`ReportTransitionService`, `AssignmentService`), evidence file ownership, database transactions, audit logging (`AuditLogService`), and public PII filtering (`Report::toPublicArray()`).
- **FastAPI (`ai-service/`):** Handles model loading, text analysis, replaceable computer vision adapters (`CLIP`, `SigLIP`, `Unavailable`), semantic embedding generation (`SentenceTransformers`), duplicate candidate scoring, Indonesian PII detection/redaction, strict Pydantic schema validation, and reproducible AI evaluation benchmarks.

**4-Layer Separation Invariant:** The platform explicitly separates:
1. Administrative report status (`ReportStatus`)
2. Actual observed fire condition (`FireCondition` + provenance)
3. AI severity/duplicate recommendations (`AiAnalysis`, `AiDuplicateCandidate`)
4. Human verification decisions (`AiReviewHistory`, `AiDuplicateDecision`, `ReportStatusHistory`)

## 2. Request & Data Flow

```text
Citizen / Admin Action (Laravel)
        │
        ▼
ReportAiOrchestrator (app/Services/Ai/ReportAiOrchestrator.php)
  ├── 1. Privacy Guardrail: POST /api/v1/privacy/redact
  │      └── Fallback on outage: LocalPiiFallbackSanitizer
  │      └── Persists AiPrivacyRecord (sanitized fields + entity_counts only)
  │
  ├── 2. Pre-AI Image Sanitization: ImageMetadataStripper (PHP GD)
  │      └── Strips EXIF/IPTC/XMP metadata before base64 encoding
  │
  ├── 3. Multimodal Triage: POST /api/v1/triage/analyze (sanitized text + stripped image)
  │      └── Persists versioned AiAnalysis (COMPLETED / FAILED, requires_human_review=true)
  │
  ├── 4. Deduplication: POST /api/v1/deduplication/analyze (sanitized text + eager-loaded candidates)
  │      └── Persists AiEmbedding + AiDuplicateCandidate rows
  │
  └── 5. Audit Trail: AuditLogService::log(AI_ANALYSIS_EXECUTED)
```

Also, whenever a citizen submits supplementary info via `CitizenReportController::provideInformation()` or `Community\ReportController::submitAdditionalInfo()`, Laravel refreshes `AiPrivacyRecord` so new PII never leaks on public pages.

## 3. Communication & Resilience

- **Authentication:** Internal shared secret via `X-AI-Service-Secret` checked using constant-time `hmac.compare_digest` in FastAPI (`require_service_auth`).
- **Correlation:** `X-Request-ID` propagated from `AiServiceClient` to FastAPI logs, response headers, `AiAnalysis.request_id`, `AiPrivacyRecord.request_id`, and `AuditLog.request_id`.
- **Resilience:** Configurable `connect_timeout_seconds` (3s), `timeout_seconds` (15s), bounded retries (`retry_times` on `ConnectionException` / 5xx), strict response key checks, sliding-window rate limiting (`AI_RATE_LIMIT_PER_MINUTE`), and `try/catch` isolation so AI outages never disrupt report submission, public tracking, or manual admin verification.

## 4. Database Design

New migrations (compatible with both SQLite for local/CI and PostgreSQL for production):
1. `ai_analyses` — Versioned AI triage results per report.
2. `ai_review_histories` — Human administrator agreement/disagreement decisions (`AGREED`, `DISAGREED`, `NEEDS_RECHECK`, `overridden_severity`, mandatory `feedback` on disagreement or severity override).
3. `ai_embeddings` — Report semantic vectors (`embedding_model`, `model_version`, `dimensions`, `content_hash`, `embedding_vector` JSON, plus optional `vector(384)` HNSW pgvector column on PostgreSQL).
4. `ai_duplicate_candidates` & `ai_duplicate_decisions` — Scored duplicate recommendations and append-only admin decisions.
5. `ai_privacy_records` — Redaction state, aggregate `entity_counts`, and sanitized public representations.
6. `ai_evaluation_runs` — Reproducible evaluation benchmark snapshots.

## 5. Deployment Topology & Security Boundaries

- **Laravel:** Deploys on Vercel serverless (`vercel.json` / `api/index.php`) or standard PHP hosting connected to PostgreSQL. Production secrets (`APP_KEY`, `DB_HOST`, `DB_USERNAME`, `DB_PASSWORD`, `AI_SERVICE_SECRET`) are injected strictly through host environment variables, with `APP_DEBUG=false`, PHP `display_errors=0`, `DEV_AUTO_LOGIN=false`, and HTTP `SecurityHeaders` middleware active.
- **FastAPI (`ai-service/`):** Deploys independently as a multi-stage, non-root (`appuser`, UID 10001) container using `ai-service/requirements-prod.txt`, `ai-service/.dockerignore`, and `docker-compose.ai.yml`. Container defaults enforce loopback binding (`127.0.0.1:8001`), read-only root filesystem (`/tmp` tmpfs), `no-new-privileges`, `cap_drop: ALL`, `AI_MAX_REQUEST_BYTES=10MB`, **CPU >= 2 vCPU**, and **RAM >= 2 GB** to hold `paraphrase-multilingual-MiniLM-L12-v2` + `openai/clip-vit-base-patch32` + PyTorch CPU in memory. Set `AI_PRELOAD_MODELS=true` and mount `/app/.cache/huggingface` as a persistent volume so cold-start model downloads do not stall initial requests. See [DEPLOYMENT.md](DEPLOYMENT.md) for exact startup and verification steps.
