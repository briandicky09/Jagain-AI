# JAGAIN AI — AI-Assisted Wildfire Reporting & Intelligence Platform

> **Tagline:** *Pantau Karhutla. Kawal Penanganannya.*

JAGAIN AI adalah platform pelaporan, pemantauan geospasial, dan koordinasi penanganan kebakaran hutan dan lahan (karhutla) di Indonesia (dengan fokus awal wilayah Kalimantan), yang dilengkapi microservice kecerdasan buatan (Python FastAPI) untuk mendukung triase awal, deteksi duplikasi semantik-geospasial, dan perlindungan privasi pelapor dengan kendali keputusan penuh tetap di tangan manusia (*human-in-the-loop*).

---

## 1. Tujuan Utama & Peran Pengguna

- **Masyarakat (Citizen):** Melaporkan kejadian karhutla lengkap dengan titik koordinat peta/GPS dan foto bukti, memantau progres empat tahap secara transparan, serta melengkapi informasi jika diminta verifikator.
- **Administrator (Verifikator):** Meninjau antrean laporan, membandingkan rekomendasi triase & kandidat duplikat AI, menyetujui/menolak/mengubah keparahan AI dengan alasan wajib, memverifikasi laporan secara resmi, dan menerbitkan penugasan ke instansi operasional.
- **Instansi / OPD (BPBD, Manggala Agni, Damkar):** Menerima penugasan lapangan, mencatat progres tindakan operasional, mengunggah bukti penanganan, memperbarui kondisi api aktual (*ground check*), dan mengajukan review penyelesaian.
- **Publik:** Memantau peta sebaran titik api dan hotspot satelit secara terbuka serta melihat kronologi penanganan dengan data pribadi pelapor yang telah disaring (*redacted*).

---

## 2. Fitur Utama

- **Pelaporan Warga Berbasis Peta:** Pemilihan koordinat interaktif Leaflet / tombol GPS perangkat, validasi batas wilayah Kalimantan, pratinjau foto aman, dan kode lacak unik (`JGN-YYYYMM-XXXXX`).
- **4-Layer Separation & Alur Resmi Terjaga:** Memisahkan secara tegas status administratif laporan, kondisi api aktual lapangan (`OBSERVED_ACTIVE`, `OBSERVED_CONTAINED`, `OBSERVED_EXTINGUISHED`, dll.), rekomendasi AI, dan keputusan verifikasi manusia.
- **AI-Assisted Multimodal Triage:** Analisis teks Bahasa Indonesia sadar negasi & indikator lahan gambut, dikombinasikan dengan adapter visi zero-shot yang dapat ditukar (`CLIP` / `SigLIP`).
- **Deteksi Duplikasi Semantik & Geospasial:** Menggunakan embedding multilingual `paraphrase-multilingual-MiniLM-L12-v2` (384-dim) + skor jarak geografis + kedekatan waktu tanpa pernah menghapus atau menggabungkan laporan asli.
- **Perlindungan Privasi Berlapis:** Penghapusan metadata EXIF/IPTC/XMP foto sebelum analisis AI (PHP GD + Pillow) dan redaksi PII (nama, NIK, telepon, email, alamat) pada pipeline AI maupun serialisasi publik (`Report::toPublicArray()`).
- **Dashboard Pemantauan & Evaluasi AI:** Menampilkan kesehatan service live, telemetri latensi/memori, hasil benchmark dev/test, serta status jujur validasi visi dunia nyata.

---

## 3. Cuplikan Antarmuka (*Screenshots*)

> *[Placeholder Screenshot — Belum dilampirkan pada repositori. Jalankan server lokal untuk mengambil tangkapan layar terbaru.]*
> - `[Screenshot 1: Beranda & Peta Sebaran Karhutla Publik (/ & /peta)]`
> - `[Screenshot 2: Formulir Pelaporan Karhutla Warga (/lapor)]`
> - `[Screenshot 3: Detail Laporan Admin dengan Panel Triase AI & Kandidat Duplikat (/admin/reports/{id})]`
> - `[Screenshot 4: Dashboard AI Intelligence & Telemetri (/admin/ai-intelligence)]`
> - `[Screenshot 5: Posko Operasional OPD & Timeline Gantt (/opd/tugas/{id})]`

---

## 4. Tech Stack & Arsitektur

- **Backend Utama:** PHP 8.3+, Laravel 13, Laravel Fortify, Wayfinder, Inertia.js v3, Pest Testing, Larastan / PHPStan Level 7.
- **Frontend:** React 19, TypeScript, Tailwind CSS 4, Vite (`vite-plus`), Radix UI, Lucide React, Sonner, Leaflet / React Leaflet.
- **Database:** PostgreSQL / Supabase (produksi) dan SQLite (pengembangan lokal & pengujian).
- **AI Microservice (`ai-service/`):** Python 3.11+, FastAPI, Pydantic v2, PyTorch CPU, Hugging Face Transformers (`openai/clip-vit-base-patch32`, `google/siglip-base-patch16-224`), Sentence Transformers (`paraphrase-multilingual-MiniLM-L12-v2`), Pillow, pytest, Ruff.

Dokumen detail arsitektur & keamanan:
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- [docs/AI_ARCHITECTURE.md](docs/AI_ARCHITECTURE.md)
- [docs/AI_API.md](docs/AI_API.md)
- [docs/AI_SECURITY.md](docs/AI_SECURITY.md)

---

## 5. Instalasi & Pengaturan Lingkungan Lokal

### Prasyarat
- PHP 8.3+ dengan ekstensi `gd`, `mbstring`, `pdo_sqlite` / `pdo_pgsql`
- Composer & Node.js 20+ / npm
- Python 3.11+

### Langkah Instalasi

1. **Siapkan Konfigurasi Laravel:**
   ```bash
   composer install
   cp .env.example .env
   php artisan key:generate
   ```

2. **Siapkan Konfigurasi AI Microservice (`ai-service/`):**
   ```bash
   cd ai-service
   python -m venv .venv
   # Windows PowerShell: .venv\Scripts\Activate.ps1
   # Linux/macOS: source .venv/bin/activate
   pip install -r requirements.txt
   cp .env.example .env
   ```

3. **Sinkronkan Shared Secret:**
   Generate secret minimal 32 karakter dan isi nilai yang sama untuk `AI_SERVICE_SECRET` pada `.env` Laravel dan `ai-service/.env`:
   ```bash
   openssl rand -hex 32
   ```

4. **Setup Database & Build Frontend:**
   ```bash
   # Di root proyek
   php artisan migrate --seed
   npm install
   npm run build
   ```

---

## 6. Menjalankan Aplikasi Lokal

Buka 2 terminal terpisah (atau gunakan Vite dev server pada terminal ke-3 jika sedang mengembangkan UI):

```bash
# Terminal 1 — AI Microservice (FastAPI)
cd ai-service
.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload
# Di Windows PowerShell: .venv\Scripts\uvicorn.exe app.main:app --host 127.0.0.1 --port 8001 --reload

# Terminal 2 — Laravel Backend
php artisan serve
```

---

## 7. Menjalankan Pengujian & Evaluasi

```bash
# Laravel Pest tests & code style
php artisan test
composer lint:check

# Frontend type check & production build
npm run types:check
npm run build

# Python lint & pytest
cd ai-service
ruff check .
pytest -v

# AI benchmark suite (dataset simulasi terstruktur)
python evaluation/benchmarks/run_benchmarks.py
```

---

## 8. Panduan Lainnya & Deployment

- **Panduan Pengguna Lengkap:** [docs/USER_GUIDE.md](docs/USER_GUIDE.md)
- **Skrip Demo Portofolio (3–5 Menit):** [docs/DEMO_GUIDE.md](docs/DEMO_GUIDE.md)
- **Panduan Deployment Produksi & Docker:** [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)
- **Evaluasi Model & Model Card:** [docs/AI_EVALUATION.md](docs/AI_EVALUATION.md), [docs/AI_MODEL_CARD.md](docs/AI_MODEL_CARD.md)
- **Laporan QA Akhir:** [docs/FINAL_QA_REPORT.md](docs/FINAL_QA_REPORT.md)
