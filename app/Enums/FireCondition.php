<?php

namespace App\Enums;

enum FireCondition: string
{
    case UNKNOWN = 'UNKNOWN';
    case REPORTED_ACTIVE = 'REPORTED_ACTIVE';
    case OBSERVED_ACTIVE = 'OBSERVED_ACTIVE';
    case OBSERVED_CONTAINED = 'OBSERVED_CONTAINED';
    case OBSERVED_EXTINGUISHED = 'OBSERVED_EXTINGUISHED';

    public function label(): string
    {
        return match ($this) {
            self::UNKNOWN => 'Belum Dicek di Lapangan',
            self::REPORTED_ACTIVE => 'Dilaporkan Ada Api Aktif',
            self::OBSERVED_ACTIVE => 'Api Masih Aktif (Cek Lapangan)',
            self::OBSERVED_CONTAINED => 'Terkendali / Sekat Dibuat',
            self::OBSERVED_EXTINGUISHED => 'Api Padam / Sisa Asap',
        };
    }
}
