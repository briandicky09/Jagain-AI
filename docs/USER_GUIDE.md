# JAGAIN AI — Panduan Pengguna (User Guide)

Dokumen ini menjelaskan alur penggunaan aplikasi JAGAIN untuk setiap peran pengguna, fungsi bantuan AI, serta perilaku perlindungan privasi dan keamanan.

---

## 1. Peran Masyarakat (Citizen)

### A. Mengirim Laporan Karhutla (`/lapor`)
1. Masuk ke akun masyarakat melalui halaman login atau registrasi.
2. Buka menu **Buat Laporan Baru** (`/lapor`).
3. Isi **Judul Ringkas**, pilih **Kategori Kejadian** (mis. Lahan Gambut, Hutan Lindung, Perkebunan), dan tentukan **Waktu Kejadian**.
4. Pilih **Provinsi** & **Kabupaten/Kota** di Kalimantan, lalu tentukan koordinat dengan salah satu cara:
   - Klik langsung pada peta interaktif.
   - Klik tombol **Gunakan Lokasi GPS Saya**.
   - Ketik angka Latitude dan Longitude secara manual.
5. Tuliskan patokan lokasi fisik, uraian kejadian, dan unggah foto bukti dari jarak aman (JPG/PNG/WEBP, maks 5 MB).
6. Centang **Pernyataan Keselamatan Warga**, lalu klik **Kirim Laporan Resmi Karhutla**.
7. Sistem menerbitkan **Kode Lacak** (`JGN-YYYYMM-XXXXX`).

### B. Memantau & Melengkapi Laporan (`/laporan-saya` & `/laporan-saya/{tracking_code}`)
- Daftar laporan dapat difilter berdasarkan status (**Semua**, **Baru Dikirim**, **Perlu Dilengkapi**, **Ditugaskan ke OPD**, **Selesai Terverifikasi**).
- Halaman pelacakan menampilkan progres 4 tahap, kondisi api lapangan terkini, instansi yang ditugaskan, kronologi resmi, serta update operasional dari regu pemadam.
- Jika status berubah menjadi **Perlu Dilengkapi (`NEEDS_INFORMATION`)**, form klarifikasi akan muncul agar warga dapat menambahkan keterangan yang diminta admin.

---

## 2. Peran Administrator (`/admin/*`)

### A. Dasbor Pusat Kendali & Antrean (`/admin/dashboard`, `/admin/reports`)
- Administrator memantau statistik status laporan, peta sebaran, dan antrean prioritas dengan pencarian & filter kategori/status serta ekspor CSV.

### B. Panel AI-Assisted Triage & Duplicate Detection (`/admin/reports/{id}`)
1. Buka detail laporan dan klik **Jalankan / Ulangi Analisis AI** pada panel **AI-Assisted Triage**.
2. Panel menampilkan:
   - **Rekomendasi Keparahan AI** (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`, `UNKNOWN`) beserta skor kepercayaan dan peringatan ketidakpastian jika keyakinan rendah (`< 0.65`).
   - **Indikator Teks & Analisis Foto** (jika ada foto bukti; metadata EXIF sudah dihapus terlebih dahulu).
   - **Kandidat Duplikat Semantik & Geospasial** lengkap dengan probabilitas duplikat, kesamaan semantik, jarak geografis (meter/km), dan selisih waktu.
3. **Human-in-the-Loop Review:**
   - Administrator wajib meninjau rekomendasi AI dan memilih **Setuju (`AGREED`)**, **Tolak (`DISAGREED`)**, atau **Perlu Pemeriksaan Ulang (`NEEDS_RECHECK`)**.
   - Jika memilih **Tolak** atau mengubah tingkat keparahan (`overridden_severity`), kolom **Alasan/Catatan wajib diisi** dan tercatat di `ai_review_histories` serta `audit_logs`.
   - Pada panel duplikat, Admin dapat mencatat keputusan **Konfirmasi Duplikat** atau **Tolak Duplikat** tanpa menghapus ataupun menggabungkan laporan asli.
4. **Keputusan Resmi:** Verifikasi laporan, permintaan informasi tambahan, dan penugasan ke OPD tetap dilakukan melalui tombol workflow resmi admin. AI **tidak pernah** mengubah status laporan atau memadamkan status api.

### C. AI Intelligence & Evaluation Dashboard (`/admin/ai-intelligence`)
- Menampilkan status koneksi live FastAPI, telemetri pemakaian (total inferensi, tingkat error, latensi rata-rata & P95, RSS memori), riwayat evaluasi model benchmark, serta status validasi foto dunia nyata.

---

## 3. Peran Instansi / OPD (`/opd/*`)

1. Buka **Dashboard OPD** (`/opd/dashboard`) atau **Tugas Lapangan** (`/opd/tugas`) untuk melihat penugasan masuk.
2. Pada detail tugas (`/opd/tugas/{id}`):
   - **Penugasan Baru (`ASSIGNED`):** Pilih **Terima Penugasan** atau **Tolak dengan Alasan**.
   - **Penanganan Aktif (`RECEIVED_BY_AGENCY` / `IN_PROGRESS`):** Catat progres operasional (`PATROL`, `CONTAINMENT`, `EXTINGUISHING`, `STATUS_CHECK`, `GENERAL_UPDATE`), perbarui observasi kondisi api aktual (*ground check*), dan unggah foto bukti lapangan.
   - **Pengajuan Selesai:** Setelah pemadaman/pendinginan tuntas, ajukan penyelesaian untuk verifikasi penutupan oleh Admin.

---

## 4. Peran Publik (`/`, `/peta`, `/laporan-publik/{tracking_code}`)

- Pengunjung publik dapat menjelajahi peta sebaran laporan warga dan titik panas satelit (simulasi NASA FIRMS), menyaring provinsi/kategori/status, dan membuka detail kronologi publik.
- Seluruh halaman publik hanya menampilkan laporan bervisibilitas `PUBLIC` dan secara otomatis menyaring identitas pelapor serta PII.

---

## 5. Perilaku Privasi & Keamanan

- **PII Guardrail:** Nama pelapor, nomor telepon/WhatsApp, NIK 16 digit, email, dan alamat jalan detail disaring sebelum teks dikirim ke modul analisis AI maupun ketika ditampilkan di halaman publik. Data mentah pelapor tetap tersimpan aman di database untuk kebutuhan verifikasi resmi administrator.
- **Pembersihan Metadata Foto:** EXIF/IPTC/XMP (seperti koordinat kamera/perangkat) dihapus dua kali — sebelum pengiriman dari Laravel (`ImageMetadataStripper`) dan sebelum inferensi visi di FastAPI (`preprocess_and_measure_image`).
- **Toleransi Gangguan AI:** Jika microservice Python sedang mati atau melampaui batas waktu (*timeout*), pelaporan warga, verifikasi admin, dan tugas OPD tetap berjalan normal tanpa error blokir.
