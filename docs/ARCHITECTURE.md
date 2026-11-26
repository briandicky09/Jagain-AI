# JAGAIN AI — System Architecture

Dokumen ini merangkum arsitektur menyeluruh aplikasi **JAGAIN AI** beserta batas tanggung jawab antar layanan dan mekanisme keamanannya. (Lihat juga spesifikasi teknis AI pada [AI_ARCHITECTURE.md](AI_ARCHITECTURE.md) dan kontrak API pada [AI_API.md](AI_API.md).)

---

## 1. Gambaran Umum Multi-Layanan

JAGAIN AI menerapkan arsitektur terpisah (*decoupled*) antara aplikasi web inti dan layanan inferensi AI:

```text
+---------------------------------------------------------------+
| Browser (React 19 + TypeScript + Inertia.js + Tailwind 4)     |
|  - Public Map & Dossier (Leaflet / React Leaflet)             |
|  - Citizen Portal | Admin Console & AI Review | OPD Posko     |
+------------------------------+--------------------------------+
                               | HTTPS + CSRF + Session Cookie
                               v
+---------------------------------------------------------------+
| Laravel 13 Backend (PHP 8.3+)                                 |
|  - Auth (Fortify), RBAC Middleware (admin, role:AGENCY)       |
|  - Policies (ReportPolicy, AssignmentPolicy)                  |
|  - Official Workflows (ReportTransitionService, Assignment)   |
|  - AuditLogService (Recursive Secret/PII Snapshot Redaction)  |
|  - Report::toPublicArray() + ImageMetadataStripper (GD)       |
|  - AiServiceClient + ReportAiOrchestrator (Fail-Closed & Try) |
+--------------+-------------------------------+----------------+
               |                               | HTTP/JSON (Loopback / Private TLS)
               | SQL (PgSQL / SQLite)          | Header: X-AI-Service-Secret + X-Request-ID
               v                               v
+----------------------------+  +-------------------------------+
| Relational Database        |  | Python FastAPI (`ai-service`) |
| - users, reports, evidence |  | - Privacy PII Guardrail       |
| - assignments, audit_logs  |  | - Negation-aware Triage Rules |
| - ai_analyses, ai_* tables |  | - CLIP / SigLIP Vision Adapter|
+----------------------------+  | - MiniLM-L12-v2 Embeddings    |
                                | - Cosine + Geo/Time Dedup     |
                                +-------------------------------+
```

---

## 2. Arsitektur Frontend

- **Inertia.js v3 (`resources/js/app.tsx`):** Menghubungkan controller Laravel langsung ke komponen halaman React (`resources/js/pages/*`) dengan *branded startup loader* di `resources/views/app.blade.php` yang otomatis dihapus saat React mount.
- **Layout & Navigasi:** Halaman terautentikasi menggunakan [app-sidebar-layout.tsx](file:///c:/Users/Thinkpad/Downloads/Jagain-AI/resources/js/layouts/app/app-sidebar-layout.tsx) dengan transisi halaman ringan `.jagain-page-enter` (mematuhi `prefers-reduced-motion`), sidebar berbasis peran ([app-sidebar.tsx](file:///c:/Users/Thinkpad/Downloads/Jagain-AI/resources/js/components/app-sidebar.tsx)), serta bottom navigation bar khusus mobile ([mobile-bottom-nav.tsx](file:///c:/Users/Thinkpad/Downloads/Jagain-AI/resources/js/components/mobile-bottom-nav.tsx)).
- **Feedback & Notifikasi Global:** [use-flash-toast.ts](file:///c:/Users/Thinkpad/Downloads/Jagain-AI/resources/js/hooks/use-flash-toast.ts) mengonversi flash Laravel (`success`, `error`, `info`) maupun event toast Inertia ke notifikasi Sonner.
- **Pemetaan Geospasial:** [karhutla-map.tsx](file:///c:/Users/Thinkpad/Downloads/Jagain-AI/resources/js/components/karhutla-map.tsx) memakai dynamic import Leaflet di sisi klien untuk menampilkan marker laporan, titik panas satelit, serta mode pilih koordinat.

---

## 3. Arsitektur Backend Laravel & Database

- **Kontrol Akses (RBAC & Policies):**
  - Middleware `auth`, `admin` (`EnsureUserIsAdmin`), dan `role:AGENCY` (`EnsureUserHasRole`) menjaga pemisahan rute warga, admin, dan OPD.
  - `ReportPolicy` dan `AssignmentPolicy` menjaga otorisasi level objek (mis. warga hanya mengakses laporannya sendiri; OPD hanya mengakses penugasan instansinya).
- **Integritas Alur Resmi (4-Layer Separation):**
  - Status administratif (`ReportStatus`), kondisi api aktual (`FireCondition`), saran AI (`AiAnalysis`, `AiDuplicateCandidate`), dan keputusan tinjauan manusia (`AiReviewHistory`, `AiDuplicateDecision`) disimpan pada kolom dan tabel terpisah.
  - Optimistic locking (`lock_version`) mencegah kondisi balapan saat transisi status atau penugasan oleh admin.
- **Database Dual-Compatibility:**
  - Skema migrasi mendukung SQLite untuk pengembangan/pengujian lokal yang cepat maupun PostgreSQL/Supabase untuk produksi (`ai_embeddings` kompatibel JSON & pgvector).

---

## 4. Arsitektur AI Microservice (`ai-service/`)

- **Modular Adapters (`app/models/`):**
  - *Embedding Adapter:* `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2` (384 dimensi CPU) dengan fallback `lightweight` untuk uji unit offline.
  - *Vision Adapter:* Interface seragam yang dapat ditukar antara `ClipZeroShotVisionAdapter` (`openai/clip-vit-base-patch32`), `SigLipZeroShotVisionAdapter` (`google/siglip-base-patch16-224`), dan `UnavailableVisionAdapter`.
- **PII Guardrail (`app/services/pii_service.py`):** Kombinasi pola terstruktur Indonesia (NIK 16 digit, telepon/WA `+62`/`08`, email, alamat RT/RW) dan aturan kontekstual nama orang dengan daftar pengecualian istilah geografis/kalimantan serta akronim (`NIK`, `KTP`, `RW`, dll.).
- **Isolasi Kegagalan:** Seluruh panggilan dari Laravel melewati `AiServiceClient` dengan timeout koneksi (3s), read timeout (15s), retry terbatas, dan validasi skema ketat. Jika FastAPI gagal atau secret kosong/tidak valid (*fail-closed*), proses bisnis Laravel tetap berjalan normal.

---

## 5. Batas Keamanan (*Security Boundaries*)

- Secret komunikasi (`AI_SERVICE_SECRET`) tidak pernah dikirim ke browser (`VITE_*`) maupun ditanam di config repo (`vercel.json`, `config/ai.php`, `docker-compose.ai.yml`).
- Container Docker AI berjalan sebagai non-root (`appuser`), filesystem root read-only, `cap_drop: ALL`, `no-new-privileges`, batas ukuran payload `10 MB`, batas ukuran foto `5 MB`, dan port terikat ke `127.0.0.1:8001` secara default.
- Detail lengkap rotasi kredensial dan mitigasi ancaman tersedia di [AI_SECURITY.md](AI_SECURITY.md).
