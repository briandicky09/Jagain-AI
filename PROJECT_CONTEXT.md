# JAGAIN — Project Context

> **Dokumen:** `PROJECT_CONTEXT.md`  
> **Sumber kebenaran:** Disusun dari kode aktual repository `Jagain-AI` serta dokumen spesifikasi [`prd.md`](./prd.md), [`TECHNICAL.md`](./TECHNICAL.md), dan [`design.md`](./design.md).

---

## 1. Ringkasan & Identitas Proyek

- **Nama produk:** **JAGAIN** (*Jaga Hutan, Kawal Penanganan*)
- **Tagline:** *"Pantau Karhutla. Kawal Penanganannya."*
- **Fokus awal wilayah:** Kebakaran hutan dan lahan (karhutla) di Kalimantan (contoh data awal berfokus pada Kalimantan Barat dan Kalimantan Tengah).
- **Tujuan utama:** Platform transparansi dan akuntabilitas publik untuk memantau laporan karhutla dari masyarakat, proses pemeriksaan/verifikasi oleh administrator, penugasan ke OPD/instansi penanganan, pembaruan progres operasional, serta peta dan kronologi publik.
- **Batasan produk (Non-Goals):**
  - **Bukan** sistem tanggap darurat resmi, layanan panggilan darurat, atau sistem *dispatch* komando operasional armada.
  - **Tidak boleh** menganggap status administratif `RESOLVED_VERIFIED` atau `CLOSED_WITH_REASON` sebagai bukti pasti api di lapangan telah padam (`fire_condition` dipisahkan secara eksplisit dari `report_status`).
  - **Tidak boleh** menyamarkan data simulasi sebagai data nyata maupun mengklaim data *real-time* tanpa integrasi terverifikasi.
  - Data pribadi pelapor (`reporter_name`, `reporter_phone`) harus dipisahkan dari respons publik.

---

## 2. Tech Stack & Tooling

### Backend
- **Bahasa & Runtime:** PHP `^8.3` (workflow CI menggunakan PHP `8.5`)
- **Framework:** Laravel `^13.17` (`laravel/framework`)
- **Full-stack Bridge:** Inertia.js Laravel `^3.0` (`inertiajs/inertia-laravel`)
- **Autentikasi & Keamanan:** Laravel Fortify `^1.37.2` (login, registrasi, verifikasi email, reset password, 2FA TOTP, serta dukungan Passkey melalui `@laravel/passkeys` / `PasskeyAuthenticatable`)
- **Routing Type-safe:** Laravel Wayfinder `^0.1.14` (`@laravel/vite-plugin-wayfinder`)
- **Static Analysis & Formatter:** Larastan / PHPStan Level 7 (`phpstan.neon`), Laravel Pint (`pint.json`)
- **Testing:** Pest `^5.3` (`pestphp/pest`, `pestphp/pest-plugin-laravel`)

### Frontend
- **UI Framework:** React `19.2.0` + TypeScript `5.7.2` + React Compiler (`babel-plugin-react-compiler`)
- **Adapter:** `@inertiajs/react` `^3.0.0`
- **Styling & Build:** Tailwind CSS `^4.0.0`, Vite `^8.0.0`, `vite-plus` (`vp`), `tw-animate-css`
- **Komponen UI & Visual:**
  - Radix UI primitives & komponen bergaya shadcn (`resources/js/components/ui/*`)
  - Kibo UI (`resources/js/components/kibo-ui/*`: `banner`, `dialog-stack`, `gantt`, `pill`, `relative-time`, `spinner`, `status`)
  - React Bits (`resources/js/components/react-bits/*`: `AnimatedContent`, `AnimatedList`, `BorderGlow`, `CountUp`, `GlareHover`, `GooeyNav`, `LogoLoop`, `MagicBento`, `ShinyText`, `SpecularButton`, `Stepper`, `TiltedCard`)
  - Ikon: `lucide-react`
  - Notifikasi toast: `sonner`
- **Peta Geospasial:** `leaflet` `^1.9.4` + `react-leaflet` `^5.0.0`
- **State, Animasi & Interaksi:** `jotai`, `gsap`, `@dnd-kit/core`, `@dnd-kit/modifiers`, `date-fns`, `input-otp`

### Database
- **Lokal / Demo / Test:** SQLite (`database/demo.sqlite` tersedia di repo; `.env.example` memakai `DB_CONNECTION=sqlite`)
- **Deployment Vercel:** PostgreSQL (via pooler Supabase, dikonfigurasi di `vercel.json`)

---

## 3. Struktur Direktori Utama

```text
Jagain-AI/
├── api/
│   └── index.php                   # Entrypoint serverless PHP untuk Vercel
├── app/
│   ├── Actions/Fortify/            # CreateNewUser, ResetUserPassword
│   ├── Concerns/                   # PasswordValidationRules, ProfileValidationRules
│   ├── Enums/                      # UserRole, ReportStatus, AssignmentStatus, FireCondition
│   ├── Http/
│   │   ├── Controllers/
│   │   │   ├── PublicController.php
│   │   │   ├── CitizenReportController.php
│   │   │   ├── Admin/              # Dashboard, Report, Agency, Category, AuditLog, Export, Map
│   │   │   ├── Agency/             # AgencyDashboardController, AgencyAssignmentController
│   │   │   ├── Community/          # DashboardController, ReportController
│   │   │   └── Settings/           # ProfileController, SecurityController
│   │   ├── Middleware/             # DevelopmentAutoLogin, EnsureUserHasRole, EnsureUserIsAdmin,
│   │   │                           # HandleAppearance, HandleInertiaRequests
│   │   └── Requests/               # StoreReportRequest, SubmitAdditionalInfoRequest, Settings/*
│   ├── Models/                     # 14 Eloquent models
│   ├── Policies/                   # ReportPolicy, AssignmentPolicy
│   ├── Providers/                  # AppServiceProvider, FortifyServiceProvider
│   └── Services/                   # ReportTransitionService, AssignmentService, AuditLogService
├── bootstrap/
│   ├── app.php                     # Konfigurasi routing, middleware aliases, trustProxies, JSON exceptions
│   └── providers.php
├── config/                         # Konfigurasi Laravel, Fortify, Inertia, Auth, Filesystems, dll.
├── database/
│   ├── demo.sqlite                 # Database SQLite demo siap pakai
│   ├── factories/                  # Factories untuk model utama
│   ├── migrations/                 # Skema tabel users, passkeys, agencies, reports, assignments, audit_logs, dll.
│   └── seeders/                    # DatabaseSeeder, KarhutlaDummyReportsSeeder, SampleCommunityReportSeeder
├── resources/
│   ├── css/app.css                 # Tailwind v4 tokens, palet JAGAIN, animasi hutan/rumput, styling Leaflet
│   ├── views/app.blade.php         # Root template Inertia
│   └── js/
│       ├── app.tsx                 # Entrypoint React/Inertia & auto-layout resolution
│       ├── actions/                # Wayfinder generated controller actions
│       ├── components/             # UI primitives, Jagain components, Kibo UI, React Bits, map & gantt
│       ├── hooks/                  # use-appearance, use-clipboard, use-flash-toast, use-two-factor-auth, dll.
│       ├── layouts/                # AppLayout, AuthLayout, SettingsLayout (+ header/sidebar variants)
│       ├── pages/                  # Halaman Inertia: public/, citizen/, community/, admin/, opd/, auth/, settings/
│       ├── routes/                 # Wayfinder generated route helpers
│       ├── types/                  # auth.ts, jagain.ts, report.ts, navigation.ts, ui.ts, index.ts
│       └── wayfinder/              # Wayfinder core helpers
├── routes/
│   ├── web.php                     # Route publik, masyarakat, admin, dan OPD
│   ├── settings.php                # Route pengaturan profil, keamanan (2FA/passkey), dan tampilan
│   └── console.php
├── tests/
│   ├── Feature/Jagain/             # PublicPageTest, ReportCreationTest, ReportAuthorizationTest,
│   │                               # ReportStatusTransitionTest, AgencyAssignmentTest
│   ├── Feature/Community/          # ReportTest
│   ├── Feature/Auth/               # Authentication, Registration, EmailVerification, 2FA, PasswordReset
│   ├── Feature/Settings/           # ProfileUpdateTest, SecurityTest
│   └── Feature/                    # AdminRoleTest, DashboardTest, DevelopmentAutoLoginTest
├── .github/workflows/tests.yml     # CI pipeline (composer setup + composer ci:check)
├── vercel.json                     # Konfigurasi deploy Vercel (sin1, vercel-php@0.8.0)
├── prd.md                          # Product Requirements Document
├── TECHNICAL.md                    # Spesifikasi teknis konseptual
└── design.md                       # Design System & pedoman UI/UX
```

---

## 4. Domain Model & Entitas Data

Terdapat **14 model Eloquent** di `app/Models/`:

| Model | Peran Utama | Relasi / Catatan Penting |
|---|---|---|
| `User` | Akun pengguna (`PUBLIC`, `COMMUNITY`, `ADMIN`, `AGENCY`), mendukung `MustVerifyEmail`, `TwoFactorAuthenticatable`, dan `PasskeyAuthenticatable` | `agencyMemberships()`, `agencies()`, `currentAgency()`, `reports()`, helper `isAdmin()`, `isAgency()`, `isCommunity()` |
| `Agency` | Instansi / OPD penanganan (mis. BPBD, Manggala Agni, Disdamkar) | Menyimpan `code`, `agency_type`, `jurisdiction`, kontak resmi, `is_active` |
| `AgencyMembership` | Keanggotaan pengguna pada `Agency` | Menyimpan `membership_status`, `role_in_agency` |
| `Category` & `ReportCategory` | Kategori kebakaran/lahan (`Lahan Gambut`, `Hutan Lindung`, `Perkebunan`, `Semak Belukar`) | Terdapat dua model kategori di codebase untuk kompatibilitas migrasi/relasi |
| `Report` | Laporan kejadian karhutla | Entitas inti pelaporan warga & verifikasi |
| `Evidence` | Bukti foto/media laporan (`storage_key`, `file_path`, `media_type`, `size_bytes`, `visibility`, `captured_at`) | Terhubung ke `Report` dan pengunggah |
| `ReportStatusHistory` | Riwayat transisi status `Report` (append-only) | Mencatat `from_status`, `to_status`, `actor_user_id`, `reason`, `note`, `public_note` |
| `Assignment` | Penugasan laporan ke `Agency` tertentu | Menyimpan `assignment_status`, `decline_reason`, `assigned_at`, `acknowledged_at`, `declined_at`, `resolved_at`, `closed_at` |
| `AssignmentHistory` | Riwayat transisi status `Assignment` | Mencatat aktor, alasan, dan catatan setiap perubahan tugas |
| `OperationalUpdate` | Pembaruan progres lapangan oleh OPD | Menyimpan `update_type`, `note`, `fire_condition_observed`, `evidence_path` |
| `DataSource` | Metadata sumber data (`COMMUNITY`, `SATELLITE`, dll.) | Menyimpan `attribution_text`, `integration_status` |
| `ExternalObservation` | Titik observasi / hotspot eksternal (satelit) | Menyimpan instrumen satelit, `confidence_level`, `brightness_kelvin`, `frp_mw`, koordinat, `observed_at`, `is_simulated` |
| `AuditLog` | Jejak audit aksi sensitif & perubahan status | Menyimpan `actor_user_id`, `action`, `entity_type`, `entity_id`, `before_snapshot`, `after_snapshot`, `reason`, `request_id`, `ip_address` |

### Mekanisme Khusus pada Model `Report` (`app/Models/Report.php`)
- **Auto-generated Code:** Saat dibuat (`creating`), jika `tracking_code` / `report_number` kosong, otomatis dibuat kode unik berformat `JGN-YYYYMM-XXXXX` (5 karakter acak uppercase).
- **Optimistic Locking:** Kolom `lock_version` diinisialisasi ke `1` dan dinaikkan setiap transisi/penugasan agar bentrokan edit admin dapat ditolak.
- **Cache Invalidation:** Hook `saved` dan `deleted` otomatis menghapus cache `public_homepage_data_v3` dan `public_map_default_payload_v3`.
- **Format Publik (`toPublicArray()`):** Mengekspos field aman untuk publik tanpa PII (`reporter_name` dan `reporter_phone` tidak disertakan), memfilter `evidence` berstatus `visibility = 'PUBLIC'`, menyertakan `status_history` dan `active_agency`, serta menghitung kategorisasi tingkat keparahan (`RINGAN`, `SEDANG`, `BERAT`) dari konten judul/deskripsi dan `fire_condition`.

---

## 5. Peran, Otorisasi & State Machine

### 5.1 Peran (`App\Enums\UserRole`)
- `PUBLIC` — Pengunjung tanpa login (hanya akses data publik).
- `COMMUNITY` — Masyarakat pelapor (membuat & melacak laporan miliknya, menambah informasi saat `NEEDS_INFORMATION`).
- `ADMIN` — Verifikator & pengelola sistem (review laporan, transisi status, penugasan ke OPD, manajemen instansi/kategori, audit log, ekspor).
- `AGENCY` — Petugas Instansi / OPD (melihat tugas milik instansi aktifnya, menerima/menolak tugas, mengirim update lapangan, mengajukan review penyelesaian).

### 5.2 Middleware & Policies
- **Alias Middleware (`bootstrap/app.php`):**
  - `admin` → `EnsureUserIsAdmin`
  - `role` → `EnsureUserHasRole` (contoh: `role:AGENCY`)
- **Middleware Web Global:**
  - `DevelopmentAutoLogin`: Jika `APP_ENV=local` dan `config('auth.dev_auto_login', false)` bernilai `true`, otomatis login sebagai user `ADMIN` pertama; menghormati sesi `manual_logout` saat user logout manual.
  - `HandleAppearance` & `HandleInertiaRequests`.
- **Policies:**
  - `ReportPolicy`:
    - `view`: mengizinkan `ADMIN`, pembuat laporan (`created_by_user_id === $user->id`), laporan berstatus `visibility === 'PUBLIC'`, atau user `AGENCY` yang instansi aktifnya memiliki `Assignment` pada laporan tersebut.
    - `provideInformation` / `uploadEvidence`: hanya pembuat laporan (`provideAdditionalInfo` juga mensyaratkan status `NEEDS_INFORMATION`).
    - `review` / `assign`: hanya `ADMIN`.
  - `AssignmentPolicy`:
    - `view`: `ADMIN`, atau user `AGENCY` yang tergabung pada `agency_id` aktif terkait.
    - `respond` / `updateProgress`: hanya user `AGENCY` dari instansi aktif pada `Assignment` terkait.

### 5.3 State Machine Status Laporan (`ReportStatus` & `ReportTransitionService`)
Semua perubahan status laporan harus melalui `ReportTransitionService::transition()` di dalam transaksi database (`DB::transaction`) dan divalidasi terhadap `VALID_TRANSITIONS`:

| Status Saat Ini | Transisi Sah Berikutnya |
|---|---|
| `SUBMITTED` | `UNDER_REVIEW`, `CLOSED_WITH_REASON` |
| `UNDER_REVIEW` | `NEEDS_INFORMATION`, `VERIFIED`, `CLOSED_WITH_REASON` |
| `NEEDS_INFORMATION` | `UNDER_REVIEW`, `CLOSED_WITH_REASON` |
| `VERIFIED` | `DISPATCHED`, `CLOSED_WITH_REASON` |
| `DISPATCHED` | `RESOLUTION_REVIEW`, `CLOSED_WITH_REASON` |
| `RESOLUTION_REVIEW` | `RESOLVED_VERIFIED`, `DISPATCHED`, `CLOSED_WITH_REASON` |
| `RESOLVED_VERIFIED` | `UNDER_REVIEW` *(reopen oleh Admin)* |
| `CLOSED_WITH_REASON` | `UNDER_REVIEW` *(reopen oleh Admin)* |

**Aturan & efek samping penting di `ReportTransitionService`:**
- Menolak transisi jika `lock_version` tidak sesuai (`ValidationException`).
- `CLOSED_WITH_REASON` mewajibkan `reason`; menutup penugasan aktif menjadi `COMPLETED` dengan `closed_at`.
- `NEEDS_INFORMATION` mewajibkan `publicNote` atau `note` dan menyimpannya ke `information_requested`.
- `RESOLVED_VERIFIED` menandai penugasan aktif menjadi `COMPLETED` dengan `resolved_at` dan mencatat `AssignmentHistory` + `AuditLog`.
- `RESOLUTION_REVIEW → DISPATCHED` mengembalikan penugasan berstatus `SUBMITTED_FOR_REVIEW` ke `IN_PROGRESS` untuk tindak lanjut tambahan.
- Setiap transisi mencatat `ReportStatusHistory` dan `AuditLog` (`REPORT_STATUS_TRANSITION`).

### 5.4 State Machine Penugasan OPD (`AssignmentStatus` & `AssignmentService`)
Status penugasan: `ASSIGNED`, `RECEIVED_BY_AGENCY`, `DECLINED_BY_AGENCY`, `IN_PROGRESS`, `SUBMITTED_FOR_REVIEW`, `COMPLETED`.

Alur di `AssignmentService`:
1. `assign()`: hanya mengizinkan laporan berstatus `VERIFIED` atau `DISPATCHED` ke `Agency` yang `is_active = true`; membuat `Assignment` (`ASSIGNED`), `AssignmentHistory`, menaikkan status laporan `VERIFIED → DISPATCHED`, dan mencatat `AuditLog`.
2. `respondToAssignment()`: OPD menerima (`RECEIVED_BY_AGENCY`, mengisi `acknowledged_at`) atau menolak (`DECLINED_BY_AGENCY`, mengisi `declined_at` dan `decline_reason`).
3. `recordOperationalUpdate()`: jika tugas masih `RECEIVED_BY_AGENCY`, otomatis beralih ke `IN_PROGRESS`; menyimpan `OperationalUpdate`, memperbarui `fire_condition` pada `Report` bila diobservasi di lapangan, dan mencatat `AuditLog`.
4. `submitForResolutionReview()`: mengubah status tugas menjadi `SUBMITTED_FOR_REVIEW` dan menaikkan status laporan `DISPATCHED → RESOLUTION_REVIEW`.

### 5.5 Kondisi Kebakaran Terpisah (`FireCondition`)
Terpisah dari status administratif:
- `UNKNOWN` — Kondisi Belum Terverifikasi Lapangan
- `REPORTED_ACTIVE` — Dilaporkan Masih Aktif
- `OBSERVED_ACTIVE` — Terobservasi Api Aktif
- `OBSERVED_CONTAINED` — Terobservasi Terkendali/Sekat Bakar
- `OBSERVED_EXTINGUISHED` — Terobservasi Padam/Asap Sisa

Selalu didampingi atribut provenance `fire_condition_source` dan `fire_condition_observed_at`.

### 5.6 Audit Trail (`AuditLogService`)
- Mencatat `actor_user_id`, `action`, `entity_type`, `entity_id`, `before_snapshot`, `after_snapshot`, `reason`, `request_id` (`X-Request-ID` atau UUID), dan `ip_address`.
- `sanitizeSnapshot()` otomatis menyamarkan (`[REDACTED]`) key sensitif: `password`, `password_hash`, `two_factor_secret`, `two_factor_recovery_codes`, `remember_token`, `reporter_phone`.

---

## 6. Peta Route & Halaman Inertia

### 6.1 Route Publik (`routes/web.php` → `PublicController`)
| Method & Path | Route Name | Halaman Inertia | Keterangan |
|---|---|---|---|
| `GET /` | `home` | `public/home` | Landing page, ringkasan publik, cara kerja, batasan platform |
| `GET /peta` | `public.map` | `public/map` | Peta karhutla publik (laporan publik + hotspot simulasi) |
| `GET /laporan-publik/{tracking_code}` | `public.reports.show` | `public/report-detail` | Detail & kronologi laporan publik tanpa PII |
| `GET /panduan-keselamatan` | `public.safety-guide` | `public/safety-guide` | Panduan keselamatan masyarakat |
| `GET /tentang-kami` | `public.about` | `public/about` | Informasi platform JAGAIN |

### 6.2 Route Masyarakat Terautentikasi (`middleware: auth`)
| Method & Path | Route Name | Controller / Halaman |
|---|---|---|
| `GET /dashboard` | `dashboard` | Dispatcher: redirect `admin.dashboard` (ADMIN), `agency.dashboard` (AGENCY), atau `Community\DashboardController` → `dashboard` |
| `GET /reports`, `GET /reports/create`, `POST /reports`, `GET /reports/{report}`, `POST /reports/{report}/additional-info` | `reports.*` | `Community\ReportController` → `community/reports/{index,create,show}` |
| `GET /lapor`, `POST /lapor`, `GET /laporan-saya`, `GET /laporan-saya/{tracking_code}`, `POST /laporan-saya/{tracking_code}/tambah-informasi` | `citizen.reports.*` | `CitizenReportController` → `citizen/{create-report,my-reports,report-tracker}` |

### 6.3 Route Admin (`prefix: /admin`, `name: admin.`, `middleware: auth, admin`)
| Fitur | Endpoint Utama (serta alias Indonesia) | Controller / Halaman |
|---|---|---|
| Dashboard | `GET /admin`, `GET /admin/dashboard` | `AdminDashboardController` → `admin/dashboard` |
| Antrean & Detail Laporan | `GET /admin/reports`, `GET /admin/reports/{report}` *(alias `/admin/laporan`)* | `AdminReportController` → `admin/reports/{index,show}` |
| Transisi Status & Penugasan | `POST /admin/reports/{report}/transitions`, `POST /admin/reports/{report}/assignments` *(alias `/status`, `/assign`)* | `AdminReportController` (`transition`, `assign`) |
| Manajemen Instansi & User OPD | `GET/POST/PUT/PATCH /admin/agencies...` *(alias `/admin/instansi...`)* | `AdminAgencyController` → `admin/agencies/index` |
| Manajemen Kategori | `GET/POST/PUT/PATCH /admin/categories...` | `AdminCategoryController` → `admin/categories/index` |
| Audit Log | `GET /admin/audit-logs` | `AdminAuditLogController` → `admin/audit-logs/index` |
| Ekspor Laporan | `GET /admin/exports/reports` | `AdminExportController` (streamed export) |
| Peta Geospasial | `GET /admin/map` *(alias `/admin/peta`)* | `AdminMapController` → `admin/map` |

### 6.4 Route OPD / Agency (`prefix: /opd`, `name: agency.`, `middleware: auth, role:AGENCY`)
| Endpoint | Route Name | Controller / Halaman |
|---|---|---|
| `GET /opd/dashboard` | `agency.dashboard` | `AgencyDashboardController` → `opd/dashboard` |
| `GET /opd/tugas`, `GET /opd/tugas/{assignment}` | `agency.assignments.{index,show}` | `AgencyAssignmentController` → `opd/{assignments-index,assignment-show}` |
| `POST /opd/tugas/{assignment}/respon` | `agency.assignments.respond` | Terima / tolak penugasan dengan alasan |
| `POST /opd/tugas/{assignment}/progres` | `agency.assignments.update-progress` | Catat pembaruan progres & kondisi api |
| `POST /opd/tugas/{assignment}/ajukan-review` | `agency.assignments.submit-review` | Ajukan penyelesaian untuk tinjauan admin |
| `GET /opd/map` *(alias `/opd/peta`)* | `agency.map` | `AdminMapController` → `admin/map` |

### 6.5 Auth & Pengaturan (`routes/settings.php` & Laravel Fortify)
- Autentikasi Fortify: `auth/{login,register,forgot-password,reset-password,verify-email,confirm-password,two-factor-challenge}`.
- Pengaturan (`settings/*`):
  - `GET/PATCH /settings/profile` & `DELETE /settings/profile` (`ProfileController` → `settings/profile`)
  - `GET /settings/security` & `PUT /settings/password` (`SecurityController` → `settings/security`, 2FA & Passkey, dilindungi `RequirePassword`)
  - `GET /settings/appearance` (`settings/appearance`)
  - `GET /.well-known/passkey-endpoints` (`well-known.passkeys`)

---

## 7. Arsitektur Frontend & Design System

- **Entrypoint (`resources/js/app.tsx`):**
  - Resolusi layout otomatis berdasarkan nama halaman Inertia:
    - `welcome` & `public/*` → tanpa wrapper layout default (menggunakan komponen `navbar`, `footer`, `emergency-banner`, dll. sendiri).
    - `auth/*` → `AuthLayout`
    - `settings/*` → `[AppLayout, SettingsLayout]`
    - Lainnya (admin, opd, citizen, community, dashboard) → `AppLayout`
  - Dibungkus `TooltipProvider` dan `Toaster` (Sonner), serta memanggil `initializeTheme()`.
- **Shared Data Inertia (`HandleInertiaRequests`):**
  - Membagikan `name`, `auth.user` (`id`, `name`, `email`, `role`, `role_label`, `phone`, `is_admin`, `is_agency`, `is_community`, `agency`), `flash`, dan `sidebarOpen`.
- **Design System (`design.md` & `resources/css/app.css`):**
  - **Palet identitas hijau-led:** `--color-forest-green: #174b35`, `--color-primary-green: #216b49`, `--color-leaf-green: #39845c`, `--color-soft-green: #e8f1eb`, `--color-pale-green: #f3f7f4`, netral `#171c19` / `#343b36` / `#68716b` / `#dde3de`, serta varian tema gelap (`.dark`: `#0d120f` dengan aksen `#10e57a`).
  - **Tipografi:** `Poppins` (di-load melalui Bunny Fonts di `vite.config.ts`).
  - **Pedoman UI/UX (`design.md`):** Bahasa Indonesia yang lugas, bebas emoji pada UI, status tidak hanya dibedakan lewat warna, target aksesibilitas WCAG 2.2 AA, menghormati `prefers-reduced-motion`, dan wajib memiliki state loading/empty/error/success.
  - **Komponen domain utama:** `karhutla-map.tsx`, `operational-gantt-timeline.tsx`, `reports/coordinate-picker.tsx`, `reports/report-map-viewer.tsx`, `status-badge.tsx`, `fire-condition-badge.tsx`, `emergency-banner.tsx`, `jagain/*`.

---

## 8. Pengembangan Lokal, Seeder, Pengujian & CI

### 8.1 Perintah Penting
- **Setup awal:** `composer setup` (install composer deps, copy `.env`, generate key, migrate, `npm install`, `npm run build`)
- **Dev server:** `composer dev` (`php artisan dev`) atau `npm run dev` (`vp dev`)
- **Build frontend:** `npm run build` (`vp build`) / `npm run build:ssr`
- **Lint & Format:**
  - PHP: `composer lint` / `composer lint:check` (`pint --parallel`)
  - JS/TS: `npm run check` / `npm run check:fix` (`vp check`)
- **Typecheck & Static Analysis:**
  - PHP: `composer types:check` (`phpstan analyse --memory-limit=1G`, level 7)
  - TS: `npm run types:check` (`tsc --noEmit`)
- **Test & CI penuh:** `composer test` (config clear, pint check, phpstan, `php artisan test`) dan `composer ci:check` (`npm run check`, `npm run types:check`, `@test`)

### 8.2 Seeder & Data Demo (`database/seeders/DatabaseSeeder.php`)
- **Akun seed lokal** *(password dev: `password`)*:
  - Admin: `admin@jagain.id` (`ADMIN`)
  - OPD Kalbar: `opd.kalbar@jagain.id`, `petugas@bpbd.go.id` (`AGENCY` → `BPBD Provinsi Kalimantan Barat`)
  - OPD Kalteng: `opd.kalteng@jagain.id` (`AGENCY` → `Manggala Agni Daops Palangka Raya`)
  - Masyarakat: `warga@jagain.id`, `warga@gmail.com` (`COMMUNITY`)
- **Master data & simulasi:** 4 kategori (`lahan-gambut`, `hutan-lindung`, `perkebunan`, `semak-belukar`), 4 instansi, 2 `DataSource` (`Laporan Masyarakat JAGAIN` dan `NASA FIRMS Hotspots Ingest (Simulasi)`), 3 `ExternalObservation` simulasi (`is_simulated=true`), serta 4 laporan contoh (`JGN-202610-KB01` s.d. `KB04`).
- Seeder tambahan: `KarhutlaDummyReportsSeeder`, `SampleCommunityReportSeeder`.

### 8.3 Pengujian & CI
- **Suite test Pest (`tests/`):**
  - Domain JAGAIN (`tests/Feature/Jagain/`): `PublicPageTest`, `ReportCreationTest`, `ReportAuthorizationTest`, `ReportStatusTransitionTest`, `AgencyAssignmentTest`
  - Fitur lain: `Community/ReportTest`, `AdminRoleTest`, `DashboardTest`, `DevelopmentAutoLoginTest`, serta seluruh suite `Auth/*` dan `Settings/*`.
- **CI (`.github/workflows/tests.yml`):** Berjalan otomatis pada `push` ke `main` dan `pull_request` di `ubuntu-latest` (PHP `8.5`, Node `22`) menjalankan `composer setup` lalu `composer ci:check`.

---

## 9. Deployment (Vercel Serverless)

- **Konfigurasi (`vercel.json`):** Runtime `vercel-php@0.8.0` pada region `sin1` (Singapura), build command `npm run build`, output `public`, mengarahkan `/build/*` dan aset statis ke `public/`, serta semua request lain ke `/api/index.php`.
- **Adaptasi Serverless (`api/index.php`):**
  - Membaca header `X-Forwarded-Proto` / `X-Forwarded-SSL` agar URL HTTPS terdeteksi benar.
  - Mengarahkan `LARAVEL_STORAGE_PATH`, cache bootstrap (`packages.php`, `services.php`, `config.php`, `routes.php`, `events.php`), dan `VIEW_COMPILED_PATH` ke `/tmp` karena filesystem Vercel bersifat *read-only*.
- **Build Vite (`vite.config.ts`):** Plugin `wayfinder` otomatis dilewati saat `process.env.VERCEL` aktif (file Wayfinder di `resources/js/actions` dan `resources/js/routes` sengaja di-commit di repo — lihat komentar di `.gitignore`).

---

## 10. Catatan Teknis, Inkonsistensi & Perhatian Keamanan

Hal-hal penting yang teramati pada kondisi kode saat ini:

1. **Keamanan Konfigurasi Deployment (`vercel.json` & `api/index.php`):**
   - `vercel.json` saat ini mendefinisikan environment variable sensitif (`APP_KEY`, kredensial PostgreSQL, serta `APP_DEBUG: "true"`) secara langsung di dalam file ter-commit. Sebelum produksi, nilai rahasia harus dirotasi dan dipindahkan ke Vercel Environment Variables, serta `APP_DEBUG` diubah menjadi `"false"`.
   - `api/index.php` saat ini mengaktifkan `display_errors=1` dan mencetak pesan, file, baris, serta stack trace PHP saat terjadi `Throwable` — harus dinonaktifkan pada lingkungan produksi.
2. **Dua Jalur Pelaporan Masyarakat Paralel:**
   - Terdapat dua set controller/route/halaman masyarakat: `/reports/*` (`Community\ReportController` → `community/reports/*`) dan `/lapor` + `/laporan-saya/*` (`CitizenReportController` → `citizen/*`). Perubahan atau perbaikan pada alur warga perlu memperhatikan kedua jalur ini atau mengonsolidasikannya.
3. **Halaman Admin Legacy vs Nested:**
   - Controller admin saat ini me-render view nested (`admin/agencies/index`, `admin/audit-logs/index`, `admin/reports/index`, `admin/reports/show`), sementara file datar (`admin/agencies-index.tsx`, `admin/audit-logs-index.tsx`, `admin/reports-index.tsx`, `admin/report-show.tsx`) masih ada di `resources/js/pages/admin/`.
4. **Duplikasi Key `'flash'` di `HandleInertiaRequests::share()`:**
   - Array return di `app/Http/Middleware/HandleInertiaRequests.php` mendefinisikan key `'flash'` sebanyak 3 kali sehingga definisi terakhir menimpa definisi sebelumnya dan menghilangkan `'info'`.
5. **Dual Tabel/Kolom Kompatibilitas:**
   - `Report` mendukung `tracking_code` sekaligus `report_number`, serta `Category` sekaligus `ReportCategory` sebagai hasil evolusi migrasi.
6. **Status Integrasi Data Satelit:**
   - Data titik panas `NASA FIRMS` yang ada saat ini berasal dari seeder simulasi (`is_simulated = true`), belum ada adapter/job ingest API eksternal live.
