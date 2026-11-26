import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import KarhutlaMap, {
    MapReport,
    MapObservation,
} from '@/components/karhutla-map';
import StatusBadge from '@/components/status-badge';
import {
    ArrowLeft,
    Satellite,
    Flame,
    Filter,
    RotateCcw,
    ChevronDown,
    ListFilter,
    X,
    MapPin,
    ArrowRight,
    Layers,
} from 'lucide-react';

interface MapPageProps {
    reports: MapReport[];
    observations: MapObservation[];
    categories: Array<{ id: number; name: string; slug: string }>;
    provinces: string[];
    filters: {
        category?: string;
        province?: string;
        status?: string;
    };
}

export default function MapPage({
    reports = [],
    observations = [],
    categories = [],
    provinces = [],
    filters = {},
}: MapPageProps) {
    const [selectedProvince, setSelectedProvince] = useState(
        filters.province || '',
    );
    const [selectedCategory, setSelectedCategory] = useState(
        filters.category || '',
    );
    const [selectedStatus, setSelectedStatus] = useState(filters.status || '');
    const [showSatelliteHotspots, setShowSatelliteHotspots] = useState(true);
    const [selectedReportForFocus, setSelectedReportForFocus] =
        useState<MapReport | null>(null);
    const [showReportsList, setShowReportsList] = useState(false);
    const [searchFilter, setSearchFilter] = useState('');

    const handleApplyFilter = () => {
        router.get(
            '/peta',
            {
                province: selectedProvince || undefined,
                category: selectedCategory || undefined,
                status: selectedStatus || undefined,
            },
            { preserveState: true },
        );
    };

    const handleResetFilter = () => {
        setSelectedProvince('');
        setSelectedCategory('');
        setSelectedStatus('');
        router.get('/peta', {}, { preserveState: true });
    };

    const displayedObservations = showSatelliteHotspots ? observations : [];
    const hasActiveFilters = Boolean(
        selectedProvince || selectedCategory || selectedStatus,
    );

    const filteredReports = reports.filter((rep) => {
        if (!searchFilter.trim()) return true;
        const q = searchFilter.toLowerCase();
        return (
            rep.title?.toLowerCase().includes(q) ||
            rep.tracking_code?.toLowerCase().includes(q) ||
            rep.regency_city?.toLowerCase().includes(q) ||
            rep.province?.toLowerCase().includes(q)
        );
    });

    return (
        <div className="flex h-[100dvh] w-full flex-col overflow-hidden bg-neutral-900 font-sans text-neutral-900 antialiased">
            <Head title="Peta Sebaran Karhutla Publik — JAGAIN" />

            {/* Top Navigation & Controls Header (No landing page navbar) */}
            <header className="z-30 flex h-14 w-full shrink-0 items-center justify-between border-b border-neutral-200 bg-white px-3 shadow-xs sm:px-6 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white">
                {/* Left: Back button & Title */}
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => {
                            if (window.history.length > 1) {
                                window.history.back();
                            } else {
                                router.visit('/');
                            }
                        }}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-neutral-300 bg-white px-3 py-1.5 text-xs font-bold text-neutral-800 shadow-2xs transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
                        title="Kembali ke halaman sebelumnya"
                    >
                        <ArrowLeft className="size-3.5 text-neutral-600 dark:text-neutral-300" />
                        <span>Kembali</span>
                    </button>

                    <div className="hidden h-4 w-px bg-neutral-200 sm:block dark:bg-neutral-700" />

                    <div className="flex items-center gap-2">
                        <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[#0c4e33] text-sm font-black tracking-tight text-white">
                            J
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xs leading-tight font-bold text-neutral-900 sm:text-sm dark:text-white">
                                    Peta Sebaran Karhutla Publik
                                </h1>
                                <span className="hidden items-center rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 md:inline-flex dark:border-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300">
                                    5 Provinsi Kalimantan
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Center / Stats Counter */}
                <div className="hidden items-center gap-3 rounded-full border border-neutral-200 bg-neutral-100 px-3.5 py-1.5 text-xs lg:flex dark:border-neutral-700 dark:bg-neutral-800/80">
                    <span className="inline-flex items-center gap-1.5 font-bold text-neutral-800 dark:text-neutral-200">
                        <span className="size-2 animate-pulse rounded-full bg-emerald-500" />
                        <span>{reports.length} Laporan Warga</span>
                    </span>
                    <span className="text-neutral-300 dark:text-neutral-600">
                        &bull;
                    </span>
                    <span className="inline-flex items-center gap-1.5 font-bold text-orange-600 dark:text-orange-400">
                        <span className="size-2 rounded-full bg-orange-500" />
                        <span>
                            {displayedObservations.length} Titik Panas FIRMS
                        </span>
                    </span>
                </div>

                {/* Right: Quick Tools */}
                <div className="flex items-center gap-2">
                    {/* Satellite layer switch button */}
                    {observations.length > 0 && (
                        <button
                            type="button"
                            onClick={() =>
                                setShowSatelliteHotspots(!showSatelliteHotspots)
                            }
                            className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold shadow-2xs transition-all ${
                                showSatelliteHotspots
                                    ? 'border-orange-200 bg-orange-50 text-orange-900 hover:bg-orange-100 dark:border-orange-800 dark:bg-orange-950/60 dark:text-orange-300'
                                    : 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400'
                            }`}
                            title="Nyalakan/matikan layer anomali termal satelit"
                        >
                            <Satellite className="size-3.5 text-orange-500" />
                            <span className="hidden sm:inline">
                                Layer Satelit
                            </span>
                            <span className="font-mono text-[11px] tabular-nums">
                                ({observations.length})
                            </span>
                        </button>
                    )}

                    {/* Toggle Report List Drawer */}
                    <button
                        type="button"
                        onClick={() => setShowReportsList(!showReportsList)}
                        className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold shadow-2xs transition-all ${
                            showReportsList
                                ? 'border-[#0c4e33] bg-[#0c4e33] text-white'
                                : 'border-neutral-200 bg-white text-neutral-800 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200'
                        }`}
                        title="Tampilkan daftar laporan"
                    >
                        <ListFilter className="size-3.5" />
                        <span className="hidden sm:inline">Daftar Titik</span>
                        <span className="font-mono text-[11px] tabular-nums">
                            ({reports.length})
                        </span>
                    </button>
                </div>
            </header>

            {/* Filter Strip Sub-header */}
            <div className="z-20 flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200 bg-neutral-50/90 px-3 py-2 text-xs backdrop-blur-xs sm:px-6 dark:border-neutral-800 dark:bg-neutral-900/90">
                <div className="flex flex-1 flex-wrap items-center gap-2">
                    {/* Province dropdown */}
                    <div className="relative">
                        <select
                            value={selectedProvince}
                            onChange={(e) =>
                                setSelectedProvince(e.target.value)
                            }
                            aria-label="Filter Provinsi"
                            className="cursor-pointer appearance-none rounded-lg border border-neutral-300 bg-white py-1.5 pr-7 pl-3 text-xs font-medium text-neutral-800 focus:border-[#0c4e33] focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
                        >
                            <option value="">Semua Provinsi</option>
                            {provinces.map((prov) => (
                                <option key={prov} value={prov}>
                                    {prov}
                                </option>
                            ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute top-1/2 right-2 size-3 -translate-y-1/2 text-neutral-400" />
                    </div>

                    {/* Category dropdown */}
                    <div className="relative">
                        <select
                            value={selectedCategory}
                            onChange={(e) =>
                                setSelectedCategory(e.target.value)
                            }
                            aria-label="Filter Kategori"
                            className="cursor-pointer appearance-none rounded-lg border border-neutral-300 bg-white py-1.5 pr-7 pl-3 text-xs font-medium text-neutral-800 focus:border-[#0c4e33] focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
                        >
                            <option value="">Semua Kategori</option>
                            {categories.map((cat) => (
                                <option key={cat.id} value={cat.slug}>
                                    {cat.name}
                                </option>
                            ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute top-1/2 right-2 size-3 -translate-y-1/2 text-neutral-400" />
                    </div>

                    {/* Status dropdown */}
                    <div className="relative">
                        <select
                            value={selectedStatus}
                            onChange={(e) => setSelectedStatus(e.target.value)}
                            aria-label="Filter Status"
                            className="cursor-pointer appearance-none rounded-lg border border-neutral-300 bg-white py-1.5 pr-7 pl-3 text-xs font-medium text-neutral-800 focus:border-[#0c4e33] focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
                        >
                            <option value="">Semua Status</option>
                            <option value="SUBMITTED">Baru Dikirim</option>
                            <option value="UNDER_REVIEW">
                                Sedang Ditinjau
                            </option>
                            <option value="VERIFIED">Terverifikasi</option>
                            <option value="DISPATCHED">
                                Ditugaskan ke OPD
                            </option>
                            <option value="RESOLVED_VERIFIED">
                                Selesai Terverifikasi
                            </option>
                        </select>
                        <ChevronDown className="pointer-events-none absolute top-1/2 right-2 size-3 -translate-y-1/2 text-neutral-400" />
                    </div>

                    {/* Apply Filter Button */}
                    <button
                        type="button"
                        onClick={handleApplyFilter}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#0c4e33] px-3 py-1.5 text-xs font-bold text-white shadow-2xs transition-colors hover:bg-[#083824]"
                    >
                        <Filter className="size-3" />
                        <span>Filter</span>
                    </button>

                    {/* Reset Button */}
                    {hasActiveFilters && (
                        <button
                            type="button"
                            onClick={handleResetFilter}
                            className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-neutral-700 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                            title="Reset seluruh filter"
                        >
                            <RotateCcw className="size-3" />
                            <span>Reset</span>
                        </button>
                    )}
                </div>

                {/* Focus Active Notice */}
                {selectedReportForFocus && (
                    <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-900">
                        <MapPin className="size-3 text-emerald-700" />
                        <span>
                            Fokus Kamera:{' '}
                            <strong>
                                {selectedReportForFocus.tracking_code}
                            </strong>
                        </span>
                        <button
                            type="button"
                            onClick={() => setSelectedReportForFocus(null)}
                            className="ml-1 flex size-4 cursor-pointer items-center justify-center rounded-full bg-emerald-200 text-[10px] text-emerald-800 hover:bg-emerald-300"
                            title="Lepas fokus"
                        >
                            ✕
                        </button>
                    </div>
                )}
            </div>

            {/* Main Full-Height Interactive Map Container */}
            <main className="relative h-[calc(100dvh-6.5rem)] w-full flex-1 overflow-hidden bg-neutral-100">
                <KarhutlaMap
                    reports={reports}
                    observations={displayedObservations}
                    selectedCoordinates={
                        selectedReportForFocus
                            ? {
                                  lat: selectedReportForFocus.latitude,
                                  lng: selectedReportForFocus.longitude,
                              }
                            : null
                    }
                    height="100%"
                    minHeight="100%"
                    showLegend={true}
                    showSimulatedNotice={false}
                    className="h-full w-full rounded-none border-0"
                />

                {/* Floating Collapsible Reports Panel */}
                {showReportsList && (
                    <div className="absolute inset-x-3 top-3 bottom-3 z-[600] flex animate-in flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white/95 shadow-2xl backdrop-blur-md duration-200 slide-in-from-right sm:right-3 sm:left-auto sm:w-96 dark:border-neutral-800 dark:bg-neutral-900/95">
                        {/* Drawer Header */}
                        <div className="flex items-center justify-between border-b border-neutral-200/80 p-4 dark:border-neutral-800">
                            <div>
                                <div className="flex items-center gap-2">
                                    <Flame className="size-4 text-emerald-600" />
                                    <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
                                        Daftar Titik Laporan
                                    </h2>
                                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-mono text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                        {filteredReports.length}
                                    </span>
                                </div>
                                <p className="mt-0.5 text-[11px] text-neutral-500">
                                    Klik baris untuk memusatkan posisi kamera
                                    peta.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowReportsList(false)}
                                className="flex size-7 items-center justify-center rounded-xl text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-black dark:hover:bg-neutral-800 dark:hover:text-white"
                            >
                                <X className="size-4" />
                            </button>
                        </div>

                        {/* Search in Drawer */}
                        <div className="border-b border-neutral-100 p-3 dark:border-neutral-800">
                            <input
                                type="text"
                                value={searchFilter}
                                onChange={(e) =>
                                    setSearchFilter(e.target.value)
                                }
                                placeholder="Cari nama lokasi atau kode..."
                                className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-800 placeholder:text-neutral-400 focus:border-[#0c4e33] focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
                            />
                        </div>

                        {/* Reports List */}
                        <div className="flex-1 divide-y divide-neutral-100 overflow-y-auto p-2 dark:divide-neutral-800">
                            {filteredReports.length === 0 ? (
                                <div className="py-12 text-center text-xs text-neutral-400">
                                    Tidak ada laporan yang sesuai pencarian.
                                </div>
                            ) : (
                                filteredReports.map((rep) => {
                                    const isFocused =
                                        selectedReportForFocus?.id === rep.id;
                                    return (
                                        <div
                                            key={rep.id}
                                            onClick={() =>
                                                setSelectedReportForFocus(rep)
                                            }
                                            className={`cursor-pointer rounded-xl p-3 text-left transition-colors ${
                                                isFocused
                                                    ? 'border border-emerald-300 bg-emerald-50/80 dark:border-emerald-700 dark:bg-emerald-950/60'
                                                    : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/60'
                                            }`}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <h3 className="line-clamp-1 text-xs font-bold text-neutral-900 dark:text-white">
                                                    {rep.title.replace(
                                                        /^\[(BERAT|SEDANG|RINGAN)\]\s*/i,
                                                        '',
                                                    )}
                                                </h3>
                                                <StatusBadge
                                                    status={rep.report_status}
                                                    label={rep.status_label}
                                                    size="sm"
                                                />
                                            </div>
                                            <div className="mt-1 flex items-center justify-between text-[11px] text-neutral-500">
                                                <span className="font-mono font-bold text-neutral-700 dark:text-neutral-300">
                                                    {rep.tracking_code}
                                                </span>
                                                <span className="max-w-[160px] truncate">
                                                    {rep.regency_city ||
                                                        rep.province}
                                                </span>
                                            </div>
                                            <div className="mt-2 flex items-center justify-between border-t border-neutral-100 pt-1 text-[10px] dark:border-neutral-800/80">
                                                <span className="font-mono text-neutral-400">
                                                    {rep.latitude.toFixed(4)},{' '}
                                                    {rep.longitude.toFixed(4)}
                                                </span>
                                                <Link
                                                    href={`/laporan-publik/${rep.tracking_code}`}
                                                    onClick={(e) =>
                                                        e.stopPropagation()
                                                    }
                                                    className="inline-flex items-center gap-1 font-bold text-[#0c4e33] hover:underline dark:text-emerald-400"
                                                >
                                                    <span>Detail</span>
                                                    <ArrowRight className="size-2.5" />
                                                </Link>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
