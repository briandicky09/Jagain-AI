<?php

namespace App\Console\Commands;

use App\Models\DataSource;
use App\Models\ExternalObservation;
use Carbon\CarbonImmutable;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use Throwable;

class SyncNasaFirmsHotspots extends Command
{
    protected $signature = 'jagain:sync-firms
        {--source= : Sensor NASA FIRMS (default dari config)}
        {--days= : Jumlah hari ke belakang 1..10 (default dari config)}
        {--bbox= : Bounding box west,south,east,north (default Kalimantan)}';

    protected $description = 'Sinkronisasi data titik panas satelit dari API NASA FIRMS ke tabel external_observations';

    public function handle(): int
    {
        $mapKey = trim((string) config('services.nasa_firms.map_key', ''));
        if ($mapKey === '') {
            $this->warn('NASA_FIRMS_MAP_KEY belum diatur. Sinkronisasi dilewati dengan aman.');

            return self::SUCCESS;
        }

        $baseUrl = rtrim((string) config('services.nasa_firms.base_url', 'https://firms.modaps.eosdis.nasa.gov/api/area/csv'), '/');
        $source = (string) ($this->option('source') ?: config('services.nasa_firms.source', 'VIIRS_SNPP_NRT'));
        $bbox = (string) ($this->option('bbox') ?: config('services.nasa_firms.bbox', '108.5,-4.5,119.5,4.5'));
        $days = max(1, min(10, (int) ($this->option('days') ?: config('services.nasa_firms.day_range', 2))));

        $endpoint = "{$baseUrl}/{$mapKey}/{$source}/{$bbox}/{$days}";

        try {
            $response = Http::timeout(20)
                ->retry(2, 500)
                ->accept('text/csv')
                ->get($endpoint);
        } catch (Throwable $e) {
            $this->error('Gagal menghubungi NASA FIRMS API: '.$e->getMessage());

            return self::FAILURE;
        }

        if (! $response->successful()) {
            $this->error('NASA FIRMS API mengembalikan status HTTP '.$response->status().'.');

            return self::FAILURE;
        }

        $body = trim($response->body());
        if ($body === '') {
            $this->info('NASA FIRMS tidak mengembalikan titik panas baru.');

            return self::SUCCESS;
        }

        $lines = preg_split('/\r\n|\r|\n/', $body) ?: [];
        if (count($lines) < 2) {
            $this->info('Tidak ada baris titik panas yang tersedia.');

            return self::SUCCESS;
        }

        $headers = array_map(fn ($h) => strtolower(trim((string) $h)), str_getcsv((string) array_shift($lines)));

        $dataSource = DataSource::firstOrCreate(
            ['code' => 'NASA_FIRMS'],
            [
                'name' => 'NASA FIRMS Satellite',
                'source_type' => 'SATELLITE_HOTSPOT',
                'attribution_text' => 'NASA FIRMS Active Fire / Thermal Anomalies',
                'integration_status' => 'ACTIVE',
            ]
        );

        $synced = 0;
        $skipped = 0;
        $now = now();

        foreach ($lines as $line) {
            if (trim($line) === '') {
                continue;
            }

            $values = str_getcsv($line);
            if (count($values) !== count($headers)) {
                $skipped++;

                continue;
            }

            /** @var array<string, string> $row */
            $row = array_combine($headers, $values);

            if (! isset($row['latitude'], $row['longitude'])) {
                $skipped++;

                continue;
            }

            $lat = (float) $row['latitude'];
            $lng = (float) $row['longitude'];
            $acqDate = trim((string) ($row['acq_date'] ?? ''));
            $acqTime = str_pad(preg_replace('/\D/', '', (string) ($row['acq_time'] ?? '0000')) ?: '0000', 4, '0', STR_PAD_LEFT);

            try {
                $observedAt = $acqDate !== ''
                    ? CarbonImmutable::createFromFormat('Y-m-d Hi', "{$acqDate} {$acqTime}", 'UTC')
                    : CarbonImmutable::now('UTC');
            } catch (Throwable) {
                $observedAt = CarbonImmutable::now('UTC');
            }

            $brightness = null;
            foreach (['bright_ti4', 'brightness', 'bright_ti5'] as $bKey) {
                if (isset($row[$bKey]) && is_numeric($row[$bKey])) {
                    $brightness = (float) $row[$bKey];
                    break;
                }
            }

            $frp = isset($row['frp']) && is_numeric($row['frp']) ? (float) $row['frp'] : null;
            $confidence = $this->normalizeConfidence((string) ($row['confidence'] ?? 'nominal'));
            $instrument = trim((string) ($row['instrument'] ?? $row['satellite'] ?? $source));

            $externalRecordId = sprintf(
                'firms_%s_%.4f_%.4f_%s_%s',
                strtolower(preg_replace('/[^a-zA-Z0-9]+/', '_', $instrument) ?: 'sensor'),
                $lat,
                $lng,
                $observedAt->format('Ymd'),
                $acqTime
            );

            ExternalObservation::updateOrCreate(
                [
                    'data_source_id' => $dataSource->id,
                    'external_record_id' => $externalRecordId,
                ],
                [
                    'satellite_instrument' => $instrument,
                    'confidence_level' => $confidence,
                    'brightness_kelvin' => $brightness,
                    'frp_mw' => $frp,
                    'latitude' => $lat,
                    'longitude' => $lng,
                    'province' => $this->inferKalimantanProvince($lat, $lng),
                    'regency_city' => null,
                    'observed_at' => $observedAt,
                    'ingested_at' => $now,
                    'is_simulated' => false,
                    'raw_metadata' => [
                        'source' => $source,
                        'satellite' => $row['satellite'] ?? null,
                        'daynight' => $row['daynight'] ?? null,
                        'version' => $row['version'] ?? null,
                    ],
                ]
            );

            $synced++;
        }

        $dataSource->update(['last_successful_sync_at' => $now]);

        $this->info("Sinkronisasi NASA FIRMS selesai: {$synced} titik panas diproses, {$skipped} baris dilewati.");

        return self::SUCCESS;
    }

    protected function normalizeConfidence(string $raw): string
    {
        $clean = strtolower(trim($raw));
        if (is_numeric($clean)) {
            $num = (float) $clean;
            if ($num >= 80) {
                return 'high';
            }
            if ($num >= 50) {
                return 'nominal';
            }

            return 'low';
        }

        return match ($clean) {
            'h', 'high' => 'high',
            'l', 'low' => 'low',
            default => 'nominal',
        };
    }

    protected function inferKalimantanProvince(float $lat, float $lng): string
    {
        if ($lng < 111.5) {
            return 'Kalimantan Barat';
        }
        if ($lng < 115.0 && $lat < -0.5) {
            return 'Kalimantan Tengah';
        }
        if ($lat < -1.5 && $lng >= 114.3 && $lng <= 116.7) {
            return 'Kalimantan Selatan';
        }
        if ($lat > 1.2) {
            return 'Kalimantan Utara';
        }

        return 'Kalimantan Timur';
    }
}
