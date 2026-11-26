# JAGAIN AI — Portfolio Video Demonstration Script (3–5 Menit)

> [!NOTE]
> Seluruh data contoh dalam demonstrasi menggunakan **data simulasi/sampel lokal** (`is_simulated` atau laporan uji lokal) untuk menjelaskan kapabilitas rekayasa sistem. Jangan menyajikan laporan uji/simulasi maupun metrik benchmark sintetis sebagai kejadian darurat lapangan yang sebenarnya atau akurasi dunia nyata.

---

## Persiapan Sebelum Merekam

1. Jalankan kedua server secara lokal:
   ```powershell
   # Terminal 1 — FastAPI AI Service
   cd c:\Users\Thinkpad\Downloads\Jagain-AI\ai-service
   .venv\Scripts\uvicorn.exe app.main:app --host 127.0.0.1 --port 8001

   # Terminal 2 — Laravel Web App
   cd c:\Users\Thinkpad\Downloads\Jagain-AI
   php artisan migrate:fresh --seed
   php artisan serve
   ```
2. Siapkan 1 foto uji karhutla (JPG/PNG di bawah 5 MB) dan kredensial akun demo dari `DatabaseSeeder` (periksa `database/seeders/DatabaseSeeder.php` untuk email akun lokal).

---

## Alur Demonstrasi 12 Langkah (Target: ~4 Menit)

### Menit 0:00 – 0:30 | 1. Intro & Masalah (Public Landing / Map)
- Buka `http://127.0.0.1:8000` dan `http://127.0.0.1:8000/peta`.
- **Narasi:** *"Ini adalah JAGAIN AI (*Pantau Karhutla. Kawal Penanganannya.*), platform pelaporan kebakaran hutan dan lahan untuk wilayah Kalimantan. Masalah utamanya bukan sekadar mengumpulkan laporan, melainkan mencegah laporan terduplikasi, menjaga privasi pelapor di publik, dan memastikan AI hanya menjadi alat bantu—bukan pengambil keputusan."*

### Menit 0:30 – 1:15 | 2–3. Pelaporan Warga (`/lapor`)
- Masuk sebagai **Masyarakat** dan buka `/lapor`.
- Pilih kategori (mis. *Lahan Gambut*), klik lokasi di peta (atau tombol **Gunakan Lokasi GPS Saya**), isi deskripsi dengan contoh PII terkontrol (mis. `"Asap tebal di lahan gambut Parit H. Ali, saksi Budi 081234567890"`), dan unggah foto bukti.
- Soroti pesan pra-pengiriman mengenai penghapusan EXIF foto & penyaringan PII sebelum menekan **Kirim Laporan Resmi Karhutla**.
- Tunjukkan **Kode Lacak (`JGN-...`)** dan 4-stage stepper pada `/laporan-saya/{tracking_code}`.

### Menit 1:15 – 2:30 | 4–8. Admin Console, AI Triage, Privacy & Deduplication (`/admin/reports/{id}`)
- Masuk sebagai **Administrator** dan buka laporan yang baru dikirim.
- Tunjukkan bahwa status resmi laporan tetap **Baru Dikirim (`SUBMITTED`)**.
- Klik **Jalankan Analisis AI** pada panel AI:
  - **Triase:** Tunjukkan rekomendasi keparahan (`HIGH`/`CRITICAL`), indikator yang memicu skor (lahan gambut, api/asap), skor kepercayaan + label metode, serta hasil visi foto.
  - **Perlindungan Privasi:** Tunjukkan badge redaksi PII dan jelaskan bahwa teks yang dikirim ke model AI sudah meredact `"Budi"` dan `"081234567890"`.
  - **Deteksi Duplikasi:** Jika ada laporan lain di koordinat berdekatan, tunjukkan skor semantik (`MiniLM`), jarak geografis (meter), dan selisih waktu. Tekankan tombol **Konfirmasi / Tolak Duplikat** tanpa menghapus laporan asli.
- Demonstrasikan **Human-in-the-Loop Review**: coba ubah keparahan tanpa alasan (validasi menolak), lalu isi alasan resmi dan simpan. Tunjukkan riwayat review tercatat.

### Menit 2:30 – 3:10 | 9. Verifikasi & Penugasan ke OPD
- Lakukan transisi resmi status laporan ke **Terverifikasi** lalu tugaskan ke salah satu OPD (mis. BPBD Kalbar / Manggala Agni).
- **Narasi:** *"Perhatikan pemisahan 4 lapis: AI menyarankan prioritas, Admin melakukan verifikasi resmi, dan OPD mencatat kondisi api aktual lapangan."*

### Menit 3:10 – 3:45 | 10. Eksekusi Lapangan OPD (`/opd/tugas/{id}`)
- Masuk sebagai pengguna **OPD**, buka penugasan baru, klik **Terima Penugasan**, lalu catat progres operasional (mis. *Penyekatan / Pembuatan Sekat Bakar*), ubah observasi kondisi api lapangan, dan unggah foto penanganan.

### Menit 3:45 – 4:15 | 11–12. Transparansi Publik, AI Monitoring & Penutup
- Buka `/laporan-publik/{tracking_code}` pada tab tanpa login (atau mode tamu).
- Tunjukkan bahwa kronologi penanganan dan status api terkini tampil jelas, **tetapi nama, nomor HP, dan metadata EXIF warga tidak terekspos (`[REDACTED_PHONE]`)**.
- Tutup dengan membuka `/admin/ai-intelligence` untuk menunjukkan pemantauan kesehatan microservice FastAPI, telemetri latensi/memori, dan status transparan benchmark serta validasi visi dunia nyata.
