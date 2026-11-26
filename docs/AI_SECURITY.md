# JAGAIN AI — Security & Privacy Architecture

## 1. Threat Model & Mitigations

| Threat | Mitigation Implemented |
|---|---|
| Unauthenticated or weak-secret calls to FastAPI | Constant-time `X-AI-Service-Secret` check (`require_service_auth`), fail-closed `AiServiceClient::hasValidSecret()` (blocks empty secrets; rejects `<32` char or default secrets in production), FastAPI startup validator requiring `>=32` non-default chars in `AI_ENV=production`, and per-caller sliding-window rate limiting (`HTTP 429`) with stale-key pruning |
| Unauthorized admin or public access | Strict Laravel RBAC (`auth`, `admin`, `role:AGENCY`, `ReportPolicy`, `AssignmentPolicy`), object-level policy enforcement, `PUBLIC`-only scope in `Report::scopePubliclyVisible()`, and route throttling on citizen (`15/min`) and admin AI endpoints (`5–30/min`) |
| PII leakage to downstream AI models | Privacy-first orchestration (`ReportAiOrchestrator`) redacts `title`, `description`, `location_description`, and `additional_information` via FastAPI `/api/v1/privacy/redact` (with local fallback `LocalPiiFallbackSanitizer`) before triage or deduplication |
| PII leakage on public web pages/APIs | `Report::toPublicArray()` reads `AiPrivacyRecord` sanitized fields (refreshed when supplementary info is submitted), falls back to `LocalPiiFallbackSanitizer`, redacts `status_history[].note`, `status_history[].reason`, and `evidence[].caption`, and strips `reporter_name` and `reporter_phone` |
| PII or secret leakage in logs & audit trails | `StructuredJsonFormatter` recursively redacts sensitive keys (`authorization`, `x-ai-service-secret`, `api_key`, `password`, `token`, `nik`, `phone`, `email`, `image_base64`, etc.); `AuditLogService::sanitizeSnapshot()` recursively redacts secret and PII keys in `before_snapshot` and `after_snapshot` |
| EXIF / GPS / camera metadata leakage in photos | **Two-stage stripping:** `ImageMetadataStripper` (PHP GD) strips EXIF/IPTC/XMP before base64 encoding from Laravel, and `preprocess_and_measure_image()` (Pillow) re-encodes to clean RGB in FastAPI |
| Unsafe uploads & DoS via huge payloads | Laravel validates MIME + image (`mimes:jpg,jpeg,png,webp`, `max:5120`), derives storage extensions from allowlisted MIME types (`basename()` filename sanitization), and FastAPI enforces both `AI_MAX_IMAGE_BYTES` (`5 MB`, HTTP `413`) and global `AI_MAX_REQUEST_BYTES` (`10 MB`, HTTP `413`) |
| Information disclosure & missing browser protections | `SecurityHeaders` middleware applies `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy`, `Permissions-Policy`, and HTTPS-only `Strict-Transport-Security` in production; `vercel.json` sets `APP_DEBUG=false`; `api/index.php` disables `display_errors` and hides stack traces in production; FastAPI disables `/docs` & `/openapi.json` and masks `environment="restricted"` when `AI_ENV=production` |
| Local dev bypass accidentally enabled | `DevelopmentAutoLogin` explicitly requires `! app()->isProduction() && app()->environment('local') && config('auth.dev_auto_login', false)` |
| Container privilege escalation | Multi-stage `ai-service/Dockerfile` runs runtime without compilers as non-root `appuser` (`uid 10001`); `docker-compose.ai.yml` sets `read_only: true`, `/tmp` tmpfs, `no-new-privileges:true`, `cap_drop: [ALL]`, loopback bind `127.0.0.1:8001`, `pids_limit: 256`, `cpus: "2.0"`, and `mem_limit: 2g` |
| AI overriding workflows or outages breaking reporting | AI results live strictly in `ai_*` tables; `ReportTransitionService`, `AssignmentService`, `ReportPolicy`, and `AssignmentPolicy` remain human-controlled; `AiServiceClient` isolates timeouts/failures with `try/catch` |

---

## 2. Secret Management & Mandatory Credential Rotation

- **Zero Secrets in Repository Config:** `vercel.json`, `config/ai.php`, `.env.example`, `ai-service/.env.example`, and `docker-compose.ai.yml` contain **no hardcoded passwords, encryption keys, or default shared secrets**. Frontend Vite code only reads `VITE_APP_NAME`.
- **Excluded Files (`.gitignore`):** `.env`, `.env.*` (except `!.env.example`), `/ai-service/.env`, `/ai-service/.env.*` (except `!/ai-service/.env.example`), `*.pem`, `*.key`, `*.p12`, `*.pfx`, `*.jks`, `*credentials*.json`, and `service-account*.json`.

> [!CAUTION]
> **Credentials Requiring Immediate Rotation Before Production Use:**
> Commit `d0474d6` ("Initial commit") in the git history of `vercel.json` previously contained a plaintext Laravel `APP_KEY` and Supabase PostgreSQL credentials (`DB_HOST` / `DB_USERNAME` / `DB_PASSWORD`). Although removed from `HEAD`, git history retains those values:
> 1. **Rotate the Supabase PostgreSQL password** (`postgres.zlukvcaeukjgvncmcppx`) immediately in the Supabase dashboard and inject the new `DB_PASSWORD` via encrypted Vercel Environment Variables.
> 2. **Generate a fresh Laravel `APP_KEY`** (`php artisan key:generate --show`) and set it exclusively in the Vercel / server environment configuration (invalidation of old encrypted cookies/sessions is expected).
> 3. **Generate a fresh 32+ character `AI_SERVICE_SECRET`** (`openssl rand -hex 32`) and configure the identical value in both Laravel and `ai-service` environment variables (never reuse `'change-me-local-shared-secret'`).

---

## 3. Data Ownership & Retention

- **Original Citizen Submissions:** `reports.title`, `reports.description`, `reports.reporter_name`, `reports.reporter_phone` are preserved intact in PostgreSQL/SQLite under `ReportPolicy`.
- **Sanitized Public Copies:** Stored in `ai_privacy_records` and returned exclusively on public routes via `Report::toPublicArray()`. `AiPrivacyRecord` stores aggregate `entity_counts` only (never raw matched strings).

---

## 4. Dependency Vulnerability Status

Audited during the security hardening pass:
- **Frontend Production Dependencies (`npm audit --omit=dev`):** **0 vulnerabilities**.
- **Frontend Dev Dependencies (`npm audit`):** 7 dev-only advisories (`@vitest/mocker` moderate, `tinypool` critical via `oxfmt`/`vite-plus` dev toolchain — not shipped in `public/build/`). Updating requires a breaking upgrade to `vite-plus@1.8.0`.
- **PHP Dependencies (`composer audit`):** 19 advisories reported across 9 packages (`laravel/framework`, `symfony/http-foundation`, `symfony/http-kernel`, `symfony/mime`, `symfony/routing`, `symfony/serializer`, `symfony/yaml`, `web-auth/webauthn-lib`, `phpunit/phpunit`). Local `composer update` failed because the current audit environment is offline (`Could not resolve host: repo.packagist.org`); run `composer update --with-dependencies` in an online CI/build environment before deploying.
