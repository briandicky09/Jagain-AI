import { ShieldCheck } from 'lucide-react';
import { getAiPiiEntityLabel } from '@/lib/ai-terminology';

interface PrivacyProtectionBadgeProps {
    sanitized?: boolean;
    redactionApplied?: boolean;
    detectorVersion?: string | null;
    entityCounts?: Record<string, number> | null;
    mode?: 'public' | 'admin';
}

export function PrivacyProtectionBadge({
    sanitized = true,
    redactionApplied = false,
    detectorVersion,
    entityCounts,
    mode = 'public',
}: PrivacyProtectionBadgeProps) {
    const totalEntities = entityCounts
        ? Object.values(entityCounts).reduce(
              (sum, count) => sum + Number(count || 0),
              0,
          )
        : 0;

    return (
        <div className="rounded-xl border border-leaf-green/30 bg-soft-green/60 px-3.5 py-2.5 text-xs text-forest-green">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 font-semibold">
                    <ShieldCheck className="size-4 shrink-0 text-primary-green" />
                    <span>
                        {mode === 'public'
                            ? sanitized
                                ? 'Data Pribadi Pelapor Dilindungi'
                                : 'Pemeriksaan Perlindungan Data Pribadi Sedang Berlangsung'
                            : redactionApplied
                              ? `Perlindungan Data Pribadi Aktif (${totalEntities} data sensitif disamarkan pada tampilan publik)`
                              : 'Perlindungan Data Pribadi Aktif (Tidak ada data pribadi sensitif terdeteksi pada teks)'}
                    </span>
                </div>
                {mode === 'admin' && detectorVersion && (
                    <span className="font-mono text-[11px] text-gray-neutral">
                        {detectorVersion}
                    </span>
                )}
            </div>
            {mode === 'public' && sanitized && (
                <p className="mt-1 pl-6 text-[11px] text-forest-green/85">
                    Informasi pribadi seperti nama, nomor telepon, dan alamat
                    disamarkan otomatis agar keamanan pelapor tetap terjaga.
                </p>
            )}
            {mode === 'admin' && redactionApplied && entityCounts && (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {Object.entries(entityCounts)
                        .filter(([, count]) => Number(count) > 0)
                        .map(([entityType, count]) => (
                            <span
                                key={entityType}
                                className="rounded-md border border-border-neutral bg-white px-2 py-0.5 text-[11px] font-medium text-dark-neutral"
                            >
                                {getAiPiiEntityLabel(entityType)}: {count}
                            </span>
                        ))}
                </div>
            )}
        </div>
    );
}
