# JAGAIN AI — Microservice API Reference

Base URL (local default): `http://127.0.0.1:8001/api/v1`

## Authentication & Headers

All endpoints except the minimal `GET /api/v1/health` liveness probe require:
- `X-AI-Service-Secret`: Shared internal secret matching `AI_SERVICE_SECRET`.
- `X-Request-ID` *(optional)*: Correlation UUID echoed in response headers and error payloads.

## Endpoints

### 1. Health & Diagnostics
- `GET /api/v1/health`
  - Without secret: returns minimal liveness `{"status": "ok", "service": "...", "environment": "..."}`.
  - With valid `X-AI-Service-Secret`: also returns `models` status and runtime `telemetry` (`pid`, `uptime_seconds`, `total_inferences`, `total_errors`, `error_rate`, `avg_latency_ms`, `p95_latency_ms`, `memory_rss_mb`, `last_successful_inference_at`).
- `GET /api/v1/health/diagnostics` *(Authenticated)*: Full model and telemetry diagnostics.

### 2. Multimodal Triage
- `POST /api/v1/triage/analyze`
  - Accepts `TriageRequest` (`report_id`, `title`, `description`, `category`, `location_description`, `additional_information`, `latitude`, `longitude`, `reported_occurrence_at`, `has_evidence_image`, optional `image_base64`, `image_filename`).
  - Returns `TriageResponse` with `analysis_version`, `schema_version`, `incident_category`, `severity_recommendation` (`LOW|MEDIUM|HIGH|CRITICAL|UNKNOWN`), `severity_rationale`, `summary`, `text_analysis` (negation-aware Indonesian wildfire extraction), `image_analysis`, `consistency`, `verification_flags`, `confidence`, `confidence_type`, `confidence_explanation`, `requires_human_review: true`, `model_name`, `model_version`, `processing_duration_ms`.

### 3. Vision Evidence Analysis
- `POST /api/v1/vision/analyze` (`multipart/form-data`, field `file`)
  - Enforces `AI_MAX_IMAGE_BYTES` (default 5 MB, HTTP `413` if exceeded), validates magic bytes via Pillow (HTTP `422` if invalid), strips EXIF metadata via clean RGB re-encoding, and routes through the configured adapter (`clip`, `siglip`, or `unavailable`).

### 4. Semantic & Geospatial Deduplication
- `POST /api/v1/deduplication/embed` — Generates 384-dim L2-normalized embedding + SHA-256 `content_hash`.
- `POST /api/v1/deduplication/analyze` — Evaluates `source_report` against up to 100 `candidates` using semantic cosine similarity, Haversine distance, temporal decay, and category compatibility (`LIKELY_DUPLICATE`, `POSSIBLE_DUPLICATE`, `UNRELATED`, `INSUFFICIENT_INFORMATION`).

### 5. Privacy Guardrails & PII Redaction
- `POST /api/v1/privacy/redact` — Detects & redacts Indonesian mobile/contact phones, validated 16-digit NIKs, emails, contextual personal names (acronym- and geography-guarded), and residential addresses. Returns sanitized strings, `entity_counts`, and span offsets without logging raw PII.

### 6. Reproducible Evaluation
- `POST /api/v1/evaluation/run` — Runs configured modules (`triage`, `deduplication`, `privacy`, `vision`) over `dev`, `test`, or `all` split and writes `ai-service/evaluation/reports/latest_benchmark.json`.

## Standard Error Format

```json
{
  "code": "VALIDATION_ERROR",
  "message": "Input payload failed Pydantic schema validation.",
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "details": { "fields": [] }
}
```
Codes: `UNAUTHORIZED_AI_CALLER` (401), `IMAGE_TOO_LARGE` (413), `INVALID_IMAGE` (422), `VALIDATION_ERROR` (422), `RATE_LIMIT_EXCEEDED` (429), `INTERNAL_AI_ERROR` (500).
