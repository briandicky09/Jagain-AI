<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Berita Acara Laporan {{ $report->tracking_code }} — JAGAIN AI</title>
    <style>
        * { box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Arial, sans-serif;
            color: #171c19;
            background: #f3f5f4;
            margin: 0;
            padding: 24px;
            font-size: 12px;
            line-height: 1.5;
        }
        .toolbar {
            max-width: 820px;
            margin: 0 auto 16px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            background: #ffffff;
            border: 1px solid #dde3de;
            border-radius: 10px;
            padding: 12px 16px;
        }
        .btn {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            border-radius: 8px;
            padding: 8px 14px;
            font-size: 12px;
            font-weight: 700;
            cursor: pointer;
            text-decoration: none;
            border: 1px solid #216b49;
            background: #216b49;
            color: #ffffff;
        }
        .btn-secondary {
            border-color: #cbd5cf;
            background: #ffffff;
            color: #171c19;
        }
        .sheet {
            max-width: 820px;
            margin: 0 auto;
            background: #ffffff;
            border: 1px solid #cfd6d1;
            padding: 32px 36px;
            box-shadow: 0 2px 12px rgba(0,0,0,0.06);
        }
        .header {
            border-bottom: 3px double #171c19;
            padding-bottom: 14px;
            margin-bottom: 18px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 16px;
        }
        .brand {
            font-size: 16px;
            font-weight: 800;
            letter-spacing: 0.04em;
            color: #174b35;
        }
        .subtitle {
            font-size: 11px;
            color: #4b5550;
            margin-top: 2px;
        }
        .doc-title {
            text-align: center;
            font-size: 14px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin: 10px 0 18px;
        }
        .badge {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 4px;
            border: 1px solid #216b49;
            background: #e8f1eb;
            color: #174b35;
            font-weight: 700;
            font-size: 11px;
        }
        .section-title {
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            background: #f3f7f4;
            border-left: 3px solid #216b49;
            padding: 5px 10px;
            margin: 18px 0 10px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10px;
        }
        th, td {
            border: 1px solid #d5dcd7;
            padding: 6px 9px;
            text-align: left;
            vertical-align: top;
            font-size: 11.5px;
        }
        th {
            background: #f7faf8;
            font-weight: 700;
            width: 28%;
        }
        .box {
            border: 1px solid #d5dcd7;
            padding: 10px 12px;
            border-radius: 6px;
            background: #fcfdfc;
            white-space: pre-line;
        }
        .note-ai {
            border: 1px solid #d9c27a;
            background: #fffbeb;
            padding: 9px 12px;
            border-radius: 6px;
            font-size: 11px;
        }
        .evidence-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
            margin-top: 8px;
        }
        .evidence-card {
            border: 1px solid #d5dcd7;
            padding: 6px;
            border-radius: 6px;
        }
        .evidence-card img {
            width: 100%;
            max-height: 200px;
            object-fit: cover;
            display: block;
            border-radius: 4px;
        }
        .footer-sign {
            margin-top: 26px;
            padding-top: 12px;
            border-top: 1px solid #d5dcd7;
            display: flex;
            justify-content: space-between;
            font-size: 11px;
            color: #4b5550;
        }
        @media print {
            body { background: #ffffff; padding: 0; }
            .toolbar { display: none !important; }
            .sheet { border: none; box-shadow: none; padding: 10mm 12mm; max-width: 100%; }
        }
    </style>
</head>
<body>
    <div class="toolbar">
        <div>
            <strong>Pratinjau Cetak / Simpan PDF</strong> — Kode Laporan: <code>{{ $report->tracking_code }}</code>
        </div>
        <div style="display:flex;gap:8px;">
            <button type="button" class="btn" onclick="window.print()">Cetak / Simpan PDF</button>
            <button type="button" class="btn btn-secondary" onclick="window.close()">Tutup</button>
        </div>
    </div>

    <div class="sheet">
        <div class="header">
            <div>
                <div class="brand">JAGAIN AI — SISTEM PEMANTAUAN KARHUTLA KALIMANTAN</div>
                <div class="subtitle">Portal Pelaporan Masyarakat, Pemeriksaan Awal AI &amp; Koordinasi Penanganan OPD</div>
            </div>
            <div style="text-align:right;font-size:11px;">
                <div><strong>Kode Lacak:</strong> {{ $report->tracking_code }}</div>
                <div><strong>Dicetak:</strong> {{ now()->translatedFormat('d M Y, H.i') }} WIB</div>
            </div>
        </div>

        <div class="doc-title">Berita Acara Ringkasan Laporan Kejadian Kebakaran Hutan &amp; Lahan</div>

        <div class="section-title">1. Informasi Pokok &amp; Status Resmi</div>
        <table>
            <tr>
                <th>Judul Laporan</th>
                <td><strong>{{ $report->title }}</strong></td>
            </tr>
            <tr>
                <th>Kategori Kawasan</th>
                <td>{{ $report->category?->name ?? 'Umum' }}</td>
            </tr>
            <tr>
                <th>Status Laporan Resmi</th>
                <td><span class="badge">{{ $reportStatusLabel }}</span></td>
            </tr>
            <tr>
                <th>Kondisi Api di Lapangan</th>
                <td>
                    <strong>{{ $fireConditionLabel }}</strong>
                    @if($report->fire_condition_source)
                        <div style="font-size:10.5px;color:#4b5550;margin-top:2px;">
                            Sumber: {{ $report->fire_condition_source }}
                            @if($report->fire_condition_observed_at)
                                ({{ $report->fire_condition_observed_at->translatedFormat('d M Y, H.i') }} WIB)
                            @endif
                        </div>
                    @endif
                </td>
            </tr>
            <tr>
                <th>Lokasi Kejadian</th>
                <td>
                    {{ $report->location_description ?? '-' }}
                    <div style="font-size:10.5px;color:#4b5550;margin-top:2px;">
                        {{ collect([$report->regency_city, $report->province])->filter()->implode(', ') ?: 'Kalimantan' }}
                        • Koordinat: {{ number_format((float) $report->latitude, 5) }}, {{ number_format((float) $report->longitude, 5) }}
                    </div>
                </td>
            </tr>
            <tr>
                <th>Waktu Masuk Laporan</th>
                <td>{{ $report->created_at?->translatedFormat('d M Y, H.i') }} WIB</td>
            </tr>
        </table>

        <div class="section-title">2. Uraian Kejadian</div>
        <div class="box">{{ $report->description }}</div>

        @if($latestAi)
            <div class="section-title">3. Ringkasan Pemeriksaan Awal AI (Non-Otomatis)</div>
            <div class="note-ai">
                <div>
                    <strong>Perkiraan Tingkat Keparahan:</strong> {{ $latestAiSeverityLabel }}
                    • <strong>Kategori Perkiraan:</strong> {{ $latestAi->potential_category ?? '-' }}
                    @if($latestAi->confidence_score !== null)
                        • <strong>Tingkat Keyakinan AI:</strong> {{ (int) round($latestAi->confidence_score * 100) }}%
                    @endif
                </div>
                <div style="margin-top:4px;color:#6b4f00;">
                    Catatan: Hasil analisis AI hanya bersifat rekomendasi bantu awal dan tidak menggantikan verifikasi resmi petugas maupun status kondisi lapangan.
                </div>
            </div>
        @endif

        @if($report->evidence->isNotEmpty())
            <div class="section-title">4. Dokumentasi Foto Bukti ({{ $report->evidence->count() }} Berkas)</div>
            <div class="evidence-grid">
                @foreach($report->evidence as $ev)
                    @php
                        $rawPath = $ev->file_path ?? $ev->storage_key;
                        $imgUrl = $rawPath
                            ? (str_starts_with($rawPath, '/') || str_starts_with($rawPath, 'storage/')
                                ? asset(ltrim($rawPath, '/'))
                                : asset('storage/'.ltrim($rawPath, '/')))
                            : null;
                    @endphp
                    @if($imgUrl)
                        <div class="evidence-card">
                            <img src="{{ $imgUrl }}" alt="Foto bukti laporan">
                            @if($ev->caption)
                                <div style="font-size:10px;color:#4b5550;margin-top:4px;">{{ $ev->caption }}</div>
                            @endif
                        </div>
                    @endif
                @endforeach
            </div>
        @endif

        <div class="section-title">5. Penugasan Instansi OPD &amp; Giat Lapangan</div>
        @if($report->assignments->isEmpty())
            <p style="color:#4b5550;">Belum ada penugasan instansi OPD yang tercatat.</p>
        @else
            <table>
                <thead>
                    <tr>
                        <th style="width:28%;">Instansi OPD</th>
                        <th style="width:20%;">Status Penugasan</th>
                        <th style="width:18%;">Tanggal Tugas</th>
                        <th style="width:34%;">Catatan / Pembaruan Lapangan</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach($report->assignments as $asg)
                        <tr>
                            <td><strong>{{ $asg->agency?->name ?? 'OPD' }}</strong></td>
                            <td>{{ $asg->assignment_status instanceof \App\Enums\AssignmentStatus ? $asg->assignment_status->label() : $asg->assignment_status }}</td>
                            <td>{{ $asg->assigned_at?->translatedFormat('d M Y, H.i') ?? '-' }} WIB</td>
                            <td>
                                @if($asg->notes)
                                    <div><em>Instruksi:</em> {{ $asg->notes }}</div>
                                @endif
                                @foreach($asg->operationalUpdates as $upd)
                                    <div style="margin-top:4px;border-top:1px dashed #dde3de;padding-top:3px;">
                                        <strong>{{ $upd->created_at?->translatedFormat('d/m H.i') }}:</strong> {{ $upd->note }}
                                    </div>
                                @endforeach
                            </td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        @endif

        <div class="section-title">6. Riwayat Perubahan Status Resmi</div>
        @if($report->statusHistories->isEmpty())
            <p style="color:#4b5550;">Belum ada riwayat perubahan status.</p>
        @else
            <table>
                <thead>
                    <tr>
                        <th style="width:22%;">Waktu</th>
                        <th style="width:26%;">Perubahan Status</th>
                        <th style="width:22%;">Petugas</th>
                        <th style="width:30%;">Catatan</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach($report->statusHistories as $hist)
                        <tr>
                            <td>{{ $hist->created_at?->translatedFormat('d M Y, H.i') ?? '-' }} WIB</td>
                            <td>{{ $hist->from_status ?? '-' }} &rarr; <strong>{{ $hist->to_status }}</strong></td>
                            <td>{{ $hist->actor?->name ?? $hist->actorUser?->name ?? 'Sistem' }}</td>
                            <td>{{ $hist->reason ?? $hist->note ?? '-' }}</td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        @endif

        <div class="footer-sign">
            <div>Dokumen ini dihasilkan otomatis oleh sistem JAGAIN AI berdasarkan catatan permanen.</div>
            <div>Pelapor: {{ $actorContextLabel }}</div>
        </div>
    </div>
</body>
</html>
