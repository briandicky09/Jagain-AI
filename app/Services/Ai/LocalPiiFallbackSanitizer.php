<?php

namespace App\Services\Ai;

/**
 * Deterministic local PII sanitizer used both as fallback when the FastAPI
 * service is unreachable and as a defense-in-depth guardrail on public views.
 */
class LocalPiiFallbackSanitizer
{
    /**
     * @return array{
     *   pii_detected: bool,
     *   redaction_applied: bool,
     *   sanitized_title: string,
     *   sanitized_description: string,
     *   sanitized_location_description: string|null,
     *   entity_counts: array<string, int>,
     *   detector_version: string
     * }
     */
    public function sanitizeReportFields(
        string $title,
        string $description,
        ?string $locationDescription = null
    ): array {
        $counts = [
            'PERSON_NAME' => 0,
            'PHONE' => 0,
            'NIK' => 0,
            'EMAIL' => 0,
            'RESIDENTIAL_ADDRESS' => 0,
        ];

        $sanitizedTitle = $this->redactText($title, $counts);
        $sanitizedDesc = $this->redactText($description, $counts);
        $sanitizedLoc = $locationDescription !== null ? $this->redactText($locationDescription, $counts) : null;

        $detected = array_sum($counts) > 0;

        return [
            'pii_detected' => $detected,
            'redaction_applied' => $detected,
            'sanitized_title' => $sanitizedTitle,
            'sanitized_description' => $sanitizedDesc,
            'sanitized_location_description' => $sanitizedLoc,
            'entity_counts' => $counts,
            'detector_version' => 'laravel-local-fallback-v1.0',
        ];
    }

    /**
     * @param  array<string, int>  $counts
     */
    public function redactText(string $text, array &$counts = []): string
    {
        if ($text === '') {
            return '';
        }

        // 1. Emails
        $text = (string) preg_replace_callback(
            '/\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/',
            function () use (&$counts): string {
                $counts['EMAIL'] = ($counts['EMAIL'] ?? 0) + 1;

                return '[REDACTED_EMAIL]';
            },
            $text
        );

        // 2. Indonesian 16-digit NIK with basic province/DOB check
        $text = (string) preg_replace_callback(
            '/(?<!\d)(\d{16})(?!\d)/',
            function (array $matches) use (&$counts): string {
                if ($this->isValidNik($matches[1])) {
                    $counts['NIK'] = ($counts['NIK'] ?? 0) + 1;

                    return '[REDACTED_NIK]';
                }

                return $matches[0];
            },
            $text
        );

        // 3. Indonesian mobile phones (+62 / 62 / 08)
        $text = (string) preg_replace_callback(
            '/(?<!\d)(?:\+?62[\s\-]?8\d{1,3}|08\d{1,3})(?:[\s\-]?\d{3,4}){2,3}(?!\d)/',
            function (array $matches) use (&$counts): string {
                $digits = preg_replace('/\D/', '', $matches[0]) ?? '';
                if (strlen($digits) >= 9 && strlen($digits) <= 15) {
                    $counts['PHONE'] = ($counts['PHONE'] ?? 0) + 1;

                    return '[REDACTED_PHONE]';
                }

                return $matches[0];
            },
            $text
        );

        // 4. Contextual phones
        $text = (string) preg_replace_callback(
            '/\b((?:hp|telepon|telp|wa|whatsapp|kontak|hubungi|nomor)\s*(?::|adalah|saya)?\s*)(\+?\d[\d\s\-]{7,15}\d)/i',
            function (array $matches) use (&$counts): string {
                $counts['PHONE'] = ($counts['PHONE'] ?? 0) + 1;

                return $matches[1].'[REDACTED_PHONE]';
            },
            $text
        );

        // 5. Residential street numbers / RT RW
        $text = (string) preg_replace_callback(
            '/\b(?:alamat(?:\s+rumah)?(?:\s+saya)?\s*(?:di|:)?\s*)?(?:(?:Jl\.?|Jalan|Gg\.?|Gang|Komplek|Perumahan|Perum)\s+[A-Za-z0-9\s.\-]{2,45}?\s+(?:No\.?\s*\d+[A-Za-z]?|Blok\s+[A-Za-z0-9\-]+)(?:\s*,?\s*RT\.?\s*\d{1,3}\s*\/?\s*RW\.?\s*\d{1,3})?|RT\.?\s*\d{1,3}\s*\/?\s*RW\.?\s*\d{1,3}(?:\s+No\.?\s*\d+[A-Za-z]?)?)/i',
            function () use (&$counts): string {
                $counts['RESIDENTIAL_ADDRESS'] = ($counts['RESIDENTIAL_ADDRESS'] ?? 0) + 1;

                return '[REDACTED_ADDRESS]';
            },
            $text
        );

        // 6. Contextual person names ("Nama saya X", "pelapor: X", "hubungi Bapak X")
        $text = (string) preg_replace_callback(
            '/\b((?i:nama\s+saya(?:\s+adalah)?|saya\s+sendiri|pelapor\s*(?::|bernama)?|atas\s+nama|hubungi\s+(?:bapak|ibu|pak|bu|sdr\.?|sdri\.?)))\s+([A-Z][a-zA-Z\'\-]+(?:\s+[A-Z][a-zA-Z\'\-]+){0,3})/u',
            function (array $matches) use (&$counts): string {
                $allowlist = [
                    'kalimantan', 'pontianak', 'bpbd', 'manggala', 'agni', 'jagain', 'desa', 'jalan',
                    'nik', 'ktp', 'sim', 'no', 'nomor', 'telepon', 'wa', 'whatsapp', 'email',
                    'bapak', 'ibu', 'pak', 'bu', 'sdr', 'sdri', 'saudara', 'tanpa', 'nama',
                ];
                $tokens = preg_split('/\s+/', trim($matches[2])) ?: [];
                $kept = [];
                foreach ($tokens as $tok) {
                    if (in_array(strtolower($tok), array_merge($allowlist, ['di', 'ke', 'dari', 'yang', 'dan', 'nomor', 'hp']), true)) {
                        break;
                    }
                    if (strlen($tok) <= 4 && strtoupper($tok) === $tok) {
                        break;
                    }
                    $kept[] = $tok;
                }

                if ($kept === []) {
                    return $matches[0];
                }

                $counts['PERSON_NAME'] = ($counts['PERSON_NAME'] ?? 0) + 1;
                $capturedName = implode(' ', $kept);
                $remainder = substr($matches[2], strlen($capturedName));

                return $matches[1].' [REDACTED_NAME]'.$remainder;
            },
            $text
        );

        return $text;
    }

    private function isValidNik(string $digits): bool
    {
        if (strlen($digits) !== 16 || ! ctype_digit($digits)) {
            return false;
        }
        $province = (int) substr($digits, 0, 2);
        $day = (int) substr($digits, 6, 2);
        $month = (int) substr($digits, 8, 2);
        $actualDay = $day > 40 ? $day - 40 : $day;

        return $province >= 11 && $province <= 95 && $actualDay >= 1 && $actualDay <= 31 && $month >= 1 && $month <= 12;
    }
}
