import { useEffect, useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import KarhutlaMap from '@/components/karhutla-map';
import {
    AlertCircle,
    ArrowLeft,
    Crosshair,
    Lock,
    Send,
    Shield,
    Trash2,
    Upload,
} from 'lucide-react';

interface CreateReportProps {
    categories: Array<{
        id: number;
        name: string;
        slug: string;
        description: string;
    }>;
    provinces: string[];
}

const DRAFT_STORAGE_KEY = 'jagain_report_draft_v1';
const MAX_FILE_BYTES = 5 * 1024 * 1024;

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function CreateReport({ categories, provinces }: CreateReportProps) {
    const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number }>({
        lat: -0.1832,
        lng: 109.3871,
    });
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [fileClientError, setFileClientError] = useState<string | null>(null);
    const [gpsStatus, setGpsStatus] = useState<{ loading: boolean; message: string | null; isError?: boolean }>({
        loading: false,
        message: null,
    });

    const [isOffline, setIsOffline] = useState<boolean>(() =>
        typeof navigator !== 'undefined' ? !navigator.onLine : false,
    );
    const [draftRestored, setDraftRestored] = useState(false);

    const { data, setData, post, processing, errors } = useForm({
        title: '',
        description: '',
        category_id: categories[0]?.id ? String(categories[0].id) : '',
        latitude: -0.1832,
        longitude: 109.3871,
        province: provinces[0] || 'Kalimantan Barat',
        regency_city: '',
        location_description: '',
        reported_occurrence_at: new Date().toISOString().slice(0, 16),
        evidence_file: null as File | null,
        safety_acknowledged: false,
    });

    useEffect(() => {
        if (typeof window === 'undefined') return;
        try {
            const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && (parsed.title || parsed.description || parsed.location_description || parsed.regency_city)) {
                    setData((prev) => ({
                        ...prev,
                        title: parsed.title ?? prev.title,
                        description: parsed.description ?? prev.description,
                        category_id: parsed.category_id ?? prev.category_id,
                        latitude: typeof parsed.latitude === 'number' ? parsed.latitude : prev.latitude,
                        longitude: typeof parsed.longitude === 'number' ? parsed.longitude : prev.longitude,
                        province: parsed.province ?? prev.province,
                        regency_city: parsed.regency_city ?? prev.regency_city,
                        location_description: parsed.location_description ?? prev.location_description,
                        reported_occurrence_at: parsed.reported_occurrence_at ?? prev.reported_occurrence_at,
                    }));
                    if (typeof parsed.latitude === 'number' && typeof parsed.longitude === 'number') {
                        setSelectedCoords({ lat: parsed.latitude, lng: parsed.longitude });
                    }
                    setDraftRestored(true);
                }
            }
        } catch {
            // Ignore malformed localStorage draft
        }

        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const hasDraftContent = Boolean(
            data.title.trim() ||
                data.description.trim() ||
                data.regency_city.trim() ||
                data.location_description.trim(),
        );
        if (!hasDraftContent) return;
        try {
            localStorage.setItem(
                DRAFT_STORAGE_KEY,
                JSON.stringify({
                    title: data.title,
                    description: data.description,
                    category_id: data.category_id,
                    latitude: data.latitude,
                    longitude: data.longitude,
                    province: data.province,
                    regency_city: data.regency_city,
                    location_description: data.location_description,
                    reported_occurrence_at: data.reported_occurrence_at,
                }),
            );
        } catch {
            // Ignore quota errors
        }
    }, [
        data.title,
        data.description,
        data.category_id,
        data.latitude,
        data.longitude,
        data.province,
        data.regency_city,
        data.location_description,
        data.reported_occurrence_at,
    ]);

    const handleClearDraft = () => {
        try {
            localStorage.removeItem(DRAFT_STORAGE_KEY);
        } catch {
            // Ignore storage errors
        }
        setDraftRestored(false);
    };

    useEffect(() => {
        return () => {
            if (previewImage) {
                URL.revokeObjectURL(previewImage);
            }
        };
    }, [previewImage]);

    const handleMapClick = (coords: { lat: number; lng: number }) => {
        setSelectedCoords(coords);
        setData((prev) => ({
            ...prev,
            latitude: coords.lat,
            longitude: coords.lng,
        }));
    };

    const handleUseMyLocation = () => {
        if (typeof navigator === 'undefined' || !navigator.geolocation) {
            setGpsStatus({
                loading: false,
                message: 'Browser tidak mendukung geolokasi GPS. Pilih titik langsung di peta.',
                isError: true,
            });
            return;
        }

        setGpsStatus({ loading: true, message: 'Mengambil koordinat GPS perangkat...' });
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const lat = parseFloat(pos.coords.latitude.toFixed(6));
                const lng = parseFloat(pos.coords.longitude.toFixed(6));
                const inKalimantan = lat >= -5 && lat <= 5 && lng >= 108 && lng <= 120;

                setSelectedCoords({ lat, lng });
                setData((prev) => ({
                    ...prev,
                    latitude: lat,
                    longitude: lng,
                }));

                setGpsStatus({
                    loading: false,
                    message: inKalimantan
                        ? `Koordinat GPS terkunci (${lat}, ${lng}).`
                        : `Koordinat GPS terdeteksi (${lat}, ${lng}), di luar batas Kalimantan (-5..5, 108..120). Sesuaikan pin pada peta jika diperlukan.`,
                    isError: !inKalimantan,
                });
            },
            () => {
                setGpsStatus({
                    loading: false,
                    message: 'Izin lokasi ditolak atau sinyal GPS gagal. Silakan klik titik di peta.',
                    isError: true,
                });
            },
            { enableHighAccuracy: true, timeout: 8000 },
        );
    };

    const handleCoordinateInput = (field: 'latitude' | 'longitude', raw: string) => {
        const parsed = parseFloat(raw);
        if (Number.isNaN(parsed)) {
            return;
        }
        const nextCoords = {
            lat: field === 'latitude' ? parsed : data.latitude,
            lng: field === 'longitude' ? parsed : data.longitude,
        };
        setData(field, parsed);
        setSelectedCoords(nextCoords);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > MAX_FILE_BYTES) {
            setFileClientError(
                `Ukuran file (${formatFileSize(file.size)}) melebihi batas maksimal 5 MB. Pilih foto yang lebih kecil.`,
            );
            e.target.value = '';
            return;
        }

        setFileClientError(null);
        if (previewImage) {
            URL.revokeObjectURL(previewImage);
        }
        setData('evidence_file', file);
        setPreviewImage(URL.createObjectURL(file));
    };

    const handleRemoveFile = () => {
        if (previewImage) {
            URL.revokeObjectURL(previewImage);
        }
        setPreviewImage(null);
        setFileClientError(null);
        setData('evidence_file', null);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (fileClientError || isOffline) return;
        post('/lapor', {
            onSuccess: () => {
                try {
                    localStorage.removeItem(DRAFT_STORAGE_KEY);
                } catch {
                    // Ignore storage errors
                }
            },
        });
    };

    return (
        <div className="flex-1 py-8 px-4 sm:px-6 lg:px-8 bg-[#F8FAF9] dark:bg-[#0D120F] min-h-screen text-[#171C19] dark:text-[#F3F7F4] font-sans overflow-x-hidden w-full max-w-full">
            <Head title="Formulir Pelaporan Karhutla — JAGAIN" />

            <div className="max-w-4xl mx-auto w-full space-y-8">
                {/* Back Link & Breadcrumb Header Strip */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#DDE3DE] dark:border-neutral-800">
                    <Link
                        href="/laporan-saya"
                        className="inline-flex items-center gap-2 text-xs font-semibold text-[#216B49] hover:text-[#174B35] dark:text-[#10e57a] dark:hover:underline transition-colors"
                    >
                        <ArrowLeft className="size-4" />
                        <span>Kembali ke Laporan Saya</span>
                    </Link>
                    <span className="font-mono text-xs text-[#68716B] dark:text-neutral-400 uppercase tracking-wider font-semibold">
                        Formulir Registrasi Laporan
                    </span>
                </div>

                {/* Header Intro */}
                <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#216B49] dark:text-[#10e57a]">
                        <Shield className="size-4" />
                        <span>Partisipasi Publik</span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#171C19] dark:text-white">
                        Laporkan Kejadian Kebakaran Hutan & Lahan
                    </h1>
                    <p className="text-sm sm:text-base text-[#68716B] dark:text-neutral-300 leading-relaxed max-w-3xl">
                        Laporan Anda memperoleh kode lacak unik dan diperiksa petugas sebelum diteruskan ke instansi penanganan resmi di Kalimantan (BPBD, Manggala Agni, atau Damkar).
                    </p>
                </div>

                {/* Safety Notice Callout Banner */}
                <div className="rounded-2xl border border-emerald-200 bg-[#E8F1EB] p-5 sm:p-6 text-[#174B35] dark:bg-emerald-950/40 dark:border-emerald-800/60 dark:text-emerald-200 space-y-2 shadow-2xs">
                    <div className="font-bold text-sm sm:text-base flex items-center gap-2">
                        <AlertCircle className="size-5 text-[#216B49] dark:text-[#10e57a] shrink-0" />
                        <span>Prioritas Utama: Jaga Jarak Aman & Keselamatan Jiwa</span>
                    </div>
                    <p className="text-xs sm:text-sm leading-relaxed text-[#174B35] dark:text-emerald-300/90">
                        Jangan pernah mendekati lidah api aktif, menghirup asap pekat beracun, atau berjalan di atas lahan gambut berasap hanya untuk mengambil foto. Ambil dokumentasi dari kejauhan di posisi aman melawan arah angin. <strong className="font-bold text-[#171C19] dark:text-white">Jika api mengancam permukiman, segera evakuasi dan hubungi darurat 112.</strong>
                    </p>
                </div>

                {/* Offline & Draft Banners */}
                {isOffline && (
                    <div
                        role="alert"
                        className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs sm:text-sm text-amber-900 shadow-2xs"
                    >
                        <strong>Koneksi internet terputus</strong> — draf laporan Anda tersimpan otomatis di perangkat dan siap dikirim saat sinyal kembali.
                    </div>
                )}

                {draftRestored && (
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#DDE3DE] bg-white p-3.5 text-xs text-[#343B36] shadow-2xs dark:border-neutral-800 dark:bg-[#141A16] dark:text-neutral-300">
                        <span>
                            Draf laporan sebelumnya dipulihkan. Jika ingin melampirkan foto, silakan pilih ulang foto bukti.
                        </span>
                        <button
                            type="button"
                            onClick={handleClearDraft}
                            className="font-semibold text-rose-600 hover:underline cursor-pointer"
                        >
                            Hapus Draf
                        </button>
                    </div>
                )}

                {/* Main Form inside Clean Card */}
                <div className="rounded-2xl border border-[#DDE3DE] bg-white p-5 sm:p-8 lg:p-10 shadow-sm dark:border-neutral-800 dark:bg-[#141A16]">
                    <form onSubmit={handleSubmit} className="space-y-10">
                        {/* Section 1: Informasi Pokok Kejadian */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 pb-3 border-b border-[#DDE3DE] dark:border-neutral-800">
                                <span className="size-7 rounded-xl bg-[#216B49] text-white text-xs font-mono font-bold flex items-center justify-center shadow-xs shrink-0">
                                    1
                                </span>
                                <h2 className="text-sm font-bold text-[#171C19] dark:text-white uppercase tracking-wider">
                                    Informasi Pokok Kejadian
                                </h2>
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="report-title" className="block text-xs font-bold text-[#171C19] dark:text-neutral-200">
                                    Judul Ringkas Laporan <span className="text-red-500">*</span>
                                </label>
                                <input
                                    id="report-title"
                                    type="text"
                                    value={data.title}
                                    onChange={(e) => setData('title', e.target.value)}
                                    placeholder="Contoh: Titik Api di Parit Sekunder Lahan Gambut Rasau Jaya"
                                    className="w-full text-sm p-3.5 rounded-xl border border-[#DDE3DE] bg-white dark:bg-neutral-900 text-[#171C19] dark:text-white focus:outline-none focus:border-[#216B49] focus:ring-2 focus:ring-[#216B49]/20 transition-all"
                                    required
                                />
                                {errors.title && <p className="text-xs text-red-500 font-medium">{errors.title}</p>}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label htmlFor="report-category" className="block text-xs font-bold text-[#171C19] dark:text-neutral-200">
                                        Kategori Kejadian <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        id="report-category"
                                        value={data.category_id}
                                        onChange={(e) => setData('category_id', e.target.value)}
                                        className="w-full text-sm p-3.5 rounded-xl border border-[#DDE3DE] bg-white dark:bg-neutral-900 text-[#171C19] dark:text-white focus:outline-none focus:border-[#216B49] focus:ring-2 focus:ring-[#216B49]/20 transition-all cursor-pointer"
                                        required
                                    >
                                        {categories.map((cat) => (
                                            <option key={cat.id} value={cat.id}>
                                                {cat.name}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.category_id && <p className="text-xs text-red-500 font-medium">{errors.category_id}</p>}
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor="report-occurrence" className="block text-xs font-bold text-[#171C19] dark:text-neutral-200">
                                        Waktu Kejadian Dilihat <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        id="report-occurrence"
                                        type="datetime-local"
                                        value={data.reported_occurrence_at}
                                        onChange={(e) => setData('reported_occurrence_at', e.target.value)}
                                        className="w-full text-sm p-3.5 rounded-xl border border-[#DDE3DE] bg-white dark:bg-neutral-900 text-[#171C19] dark:text-white focus:outline-none focus:border-[#216B49] focus:ring-2 focus:ring-[#216B49]/20 transition-all"
                                        required
                                    />
                                    {errors.reported_occurrence_at && (
                                        <p className="text-xs text-red-500 font-medium">{errors.reported_occurrence_at}</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Section 2: Penentuan Lokasi Geografis & Peta */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 pb-3 border-b border-[#DDE3DE] dark:border-neutral-800">
                                <span className="size-7 rounded-xl bg-[#216B49] text-white text-xs font-mono font-bold flex items-center justify-center shadow-xs shrink-0">
                                    2
                                </span>
                                <h2 className="text-sm font-bold text-[#171C19] dark:text-white uppercase tracking-wider">
                                    Penentuan Lokasi Geografis Kalimantan
                                </h2>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label htmlFor="report-province" className="block text-xs font-bold text-[#171C19] dark:text-neutral-200">
                                        Provinsi di Kalimantan <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        id="report-province"
                                        value={data.province}
                                        onChange={(e) => setData('province', e.target.value)}
                                        className="w-full text-sm p-3.5 rounded-xl border border-[#DDE3DE] bg-white dark:bg-neutral-900 text-[#171C19] dark:text-white focus:outline-none focus:border-[#216B49] focus:ring-2 focus:ring-[#216B49]/20 transition-all cursor-pointer"
                                        required
                                    >
                                        {provinces.map((prov) => (
                                            <option key={prov} value={prov}>
                                                {prov}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.province && <p className="text-xs text-red-500 font-medium">{errors.province}</p>}
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor="report-regency" className="block text-xs font-bold text-[#171C19] dark:text-neutral-200">
                                        Kabupaten / Kota <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        id="report-regency"
                                        type="text"
                                        value={data.regency_city}
                                        onChange={(e) => setData('regency_city', e.target.value)}
                                        placeholder="Contoh: Kabupaten Kubu Raya"
                                        className="w-full text-sm p-3.5 rounded-xl border border-[#DDE3DE] bg-white dark:bg-neutral-900 text-[#171C19] dark:text-white focus:outline-none focus:border-[#216B49] focus:ring-2 focus:ring-[#216B49]/20 transition-all"
                                        required
                                    />
                                    {errors.regency_city && <p className="text-xs text-red-500 font-medium">{errors.regency_city}</p>}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <label className="block text-xs font-bold text-[#171C19] dark:text-neutral-200">
                                        Tentukan Titik Koordinat pada Peta <span className="text-red-500">*</span>
                                    </label>
                                    <button
                                        type="button"
                                        onClick={handleUseMyLocation}
                                        disabled={gpsStatus.loading}
                                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#216B49]/30 bg-[#E8F1EB] px-3 py-1.5 text-xs font-semibold text-[#174B35] hover:bg-[#d8e8dd] transition-colors cursor-pointer disabled:opacity-60 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                                    >
                                        <Crosshair className="size-3.5" />
                                        <span>{gpsStatus.loading ? 'Mencari GPS...' : 'Gunakan Lokasi GPS Saya'}</span>
                                    </button>
                                </div>

                                <p className="text-xs text-[#68716B] dark:text-neutral-400">
                                    Klik pada peta interaktif di bawah atau gunakan tombol GPS untuk mengunci koordinat lokasi di wilayah Kalimantan (-5 s/d 5 LU/LS, 108 s/d 120 BT).
                                </p>

                                {gpsStatus.message && (
                                    <p
                                        role={gpsStatus.isError ? 'alert' : 'status'}
                                        className={`text-xs font-medium rounded-lg px-3 py-2 border ${gpsStatus.isError
                                            ? 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300'
                                            : 'bg-[#E8F1EB] border-emerald-200 text-[#174B35] dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300'
                                            }`}
                                    >
                                        {gpsStatus.message}
                                    </p>
                                )}

                                <div className="rounded-2xl overflow-hidden border border-[#DDE3DE] dark:border-neutral-800 shadow-xs">
                                    <KarhutlaMap
                                        interactiveSelectMode={true}
                                        selectedCoordinates={selectedCoords}
                                        onSelectCoordinates={handleMapClick}
                                        height="340px"
                                        showLegend={false}
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 font-mono">
                                    <div className="bg-[#F8FAF9] dark:bg-neutral-900 p-3.5 rounded-xl border border-[#DDE3DE] dark:border-neutral-800">
                                        <label htmlFor="report-lat" className="text-[11px] text-[#68716B] dark:text-neutral-400 block mb-1">
                                            Lintang (Latitude):
                                        </label>
                                        <input
                                            id="report-lat"
                                            type="number"
                                            step="any"
                                            value={data.latitude}
                                            onChange={(e) => handleCoordinateInput('latitude', e.target.value)}
                                            className="w-full bg-transparent text-xs font-bold text-[#171C19] dark:text-white focus:outline-none"
                                            required
                                        />
                                    </div>
                                    <div className="bg-[#F8FAF9] dark:bg-neutral-900 p-3.5 rounded-xl border border-[#DDE3DE] dark:border-neutral-800">
                                        <label htmlFor="report-lng" className="text-[11px] text-[#68716B] dark:text-neutral-400 block mb-1">
                                            Bujur (Longitude):
                                        </label>
                                        <input
                                            id="report-lng"
                                            type="number"
                                            step="any"
                                            value={data.longitude}
                                            onChange={(e) => handleCoordinateInput('longitude', e.target.value)}
                                            className="w-full bg-transparent text-xs font-bold text-[#171C19] dark:text-white focus:outline-none"
                                            required
                                        />
                                    </div>
                                </div>
                                {errors.latitude && <p className="text-xs text-red-500 font-medium">{errors.latitude}</p>}
                                {errors.longitude && <p className="text-xs text-red-500 font-medium">{errors.longitude}</p>}
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="report-location-desc" className="block text-xs font-bold text-[#171C19] dark:text-neutral-200">
                                    Petunjuk Patokan Lokasi Fisik <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    id="report-location-desc"
                                    value={data.location_description}
                                    onChange={(e) => setData('location_description', e.target.value)}
                                    rows={2}
                                    placeholder="Contoh: Sekitar 2 km ke arah timur dari Pos Damkar Desa, di belakang deretan kebun sawit tua dekat parit sekunder."
                                    className="w-full text-sm p-3.5 rounded-xl border border-[#DDE3DE] bg-white dark:bg-neutral-900 text-[#171C19] dark:text-white focus:outline-none focus:border-[#216B49] focus:ring-2 focus:ring-[#216B49]/20 transition-all resize-none"
                                    required
                                />
                                {errors.location_description && (
                                    <p className="text-xs text-red-500 font-medium">{errors.location_description}</p>
                                )}
                            </div>
                        </div>

                        {/* Section 3: Rincian Kejadian & Bukti Visual */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 pb-3 border-b border-[#DDE3DE] dark:border-neutral-800">
                                <span className="size-7 rounded-xl bg-[#216B49] text-white text-xs font-mono font-bold flex items-center justify-center shadow-xs shrink-0">
                                    3
                                </span>
                                <h2 className="text-sm font-bold text-[#171C19] dark:text-white uppercase tracking-wider">
                                    Rincian Kejadian & Bukti Visual
                                </h2>
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="report-description" className="block text-xs font-bold text-[#171C19] dark:text-neutral-200">
                                    Deskripsi Kejadian Karhutla <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    id="report-description"
                                    value={data.description}
                                    onChange={(e) => setData('description', e.target.value)}
                                    rows={4}
                                    placeholder="Jelaskan kondisi api (asap tebal atau kobaran api), jenis vegetasi (gambut/semak/hutan), perkiraan luas, dan kedekatan dengan permukiman..."
                                    className="w-full text-sm p-3.5 rounded-xl border border-[#DDE3DE] bg-white dark:bg-neutral-900 text-[#171C19] dark:text-white focus:outline-none focus:border-[#216B49] focus:ring-2 focus:ring-[#216B49]/20 transition-all"
                                    required
                                />
                                {errors.description && <p className="text-xs text-red-500 font-medium">{errors.description}</p>}
                            </div>

                            <div className="space-y-3">
                                <label htmlFor="report-evidence" className="block text-xs font-bold text-[#171C19] dark:text-neutral-200">
                                    Unggah Foto Bukti Kejadian (Opsional, Direkomendasikan)
                                </label>
                                <p className="text-xs text-[#68716B] dark:text-neutral-400">
                                    Foto dari jarak aman membantu petugas memeriksa kondisi kebakaran. Data teknis tersembunyi pada foto otomatis dibersihkan demi keamanan pelapor. Format JPG/PNG/WEBP (Maks 5 MB).
                                </p>

                                <div className="relative border-2 border-dashed border-[#DDE3DE] dark:border-neutral-800 rounded-2xl p-6 sm:p-8 text-center hover:border-[#216B49] dark:hover:border-[#10e57a] transition-colors cursor-pointer bg-[#F8FAF9] dark:bg-neutral-900/50">
                                    <input
                                        id="report-evidence"
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp"
                                        onChange={handleFileChange}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    />
                                    <div className="flex flex-col items-center justify-center gap-2">
                                        <div className="size-12 rounded-xl bg-white dark:bg-neutral-800 border border-[#DDE3DE] dark:border-neutral-700 flex items-center justify-center text-[#216B49] dark:text-[#10e57a] shadow-2xs">
                                            <Upload className="size-6" />
                                        </div>
                                        <div className="text-xs sm:text-sm font-semibold text-[#171C19] dark:text-white">
                                            Klik untuk memilih file foto bukti kejadian
                                        </div>
                                        <div className="text-xs text-[#68716B] dark:text-neutral-400 font-mono">
                                            JPEG, PNG, WEBP hingga 5 MB
                                        </div>
                                    </div>
                                </div>

                                {fileClientError && (
                                    <p role="alert" className="text-xs text-red-600 font-medium">
                                        {fileClientError}
                                    </p>
                                )}

                                {previewImage && data.evidence_file && (
                                    <div className="mt-4 flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-[#F8FAF9] dark:bg-neutral-900 border border-[#DDE3DE] dark:border-neutral-800">
                                        <div className="flex items-center gap-4 min-w-0">
                                            <img
                                                src={previewImage}
                                                alt="Pratinjau bukti"
                                                className="size-20 object-cover rounded-lg border border-[#DDE3DE] shrink-0"
                                            />
                                            <div className="text-xs min-w-0">
                                                <div className="font-bold text-[#171C19] dark:text-white truncate">
                                                    {data.evidence_file.name}
                                                </div>
                                                <div className="text-[11px] font-mono text-[#68716B] dark:text-neutral-400 mt-0.5">
                                                    {formatFileSize(data.evidence_file.size)} &bull; Siap diunggah
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleRemoveFile}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 bg-white text-xs font-semibold text-red-700 hover:bg-red-50 transition-colors cursor-pointer dark:border-red-900/50 dark:bg-neutral-800 dark:text-red-400"
                                        >
                                            <Trash2 className="size-3.5" />
                                            <span>Hapus Foto</span>
                                        </button>
                                    </div>
                                )}
                                {errors.evidence_file && <p className="text-xs text-red-500 font-medium">{errors.evidence_file}</p>}
                            </div>
                        </div>

                        {/* Section 4: Apa yang Terjadi Setelah Dikirim & Perlindungan Privasi */}
                        <div className="rounded-2xl border border-[#DDE3DE] bg-[#F3F7F4] p-5 sm:p-6 space-y-2.5 dark:border-neutral-800 dark:bg-neutral-900/70">
                            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#174B35] dark:text-[#10e57a]">
                                <Lock className="size-4 shrink-0" />
                                <span>Alur Pasca-Kirim & Perlindungan Privasi</span>
                            </div>
                            <ul className="grid grid-cols-1 gap-2 text-xs leading-relaxed text-[#343B36] sm:grid-cols-2 dark:text-neutral-300">
                                <li>
                                    1. Sistem menerbitkan kode lacak unik{' '}
                                    (<code className="font-mono font-semibold text-[#171C19] dark:text-white">JGN-...</code>){' '}
                                    untuk memantau progres secara langsung.
                                </li>
                                <li>
                                    2. Identitas pribadi (nama, telepon,
                                    NIK/email di teks) serta data lokasi/perangkat
                                    tersembunyi pada foto
                                    disaring sebelum tampil ke publik.
                                </li>
                                <li>
                                    3. Rekomendasi AI bersifat alat bantu awal
                                    dan tidak pernah memverifikasi atau menolak
                                    laporan secara otomatis.
                                </li>
                                <li>
                                    4. Administrator melakukan verifikasi resmi
                                    sebelum menerbitkan penugasan ke OPD
                                    terkait.
                                </li>
                            </ul>
                        </div>

                        {/* Section 5: Pernyataan Keselamatan Wajib */}
                        <div className="rounded-2xl p-5 sm:p-6 bg-[#E8F1EB] dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 space-y-2 text-xs leading-relaxed text-[#174B35] dark:text-emerald-200">
                            <label className="flex items-start gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={data.safety_acknowledged}
                                    onChange={(e) => setData('safety_acknowledged', e.target.checked)}
                                    className="mt-0.5 size-4 accent-[#216B49] rounded cursor-pointer shrink-0"
                                    required
                                />
                                <span className="font-medium">
                                    <strong className="font-bold text-[#171C19] dark:text-white">Pernyataan Keselamatan Warga:</strong> Saya menyatakan bahwa informasi ini saya ambil dari jarak yang aman tanpa membahayakan keselamatan diri atau melintasi lahan gambut berasap. Saya memahami bahwa JAGAIN adalah platform pengawalan akuntabilitas dan bukan saluran darurat 112.
                                </span>
                            </label>
                            {errors.safety_acknowledged && (
                                <p className="text-xs text-red-500 font-medium pl-7">{errors.safety_acknowledged}</p>
                            )}
                        </div>

                        {/* Submit Button */}
                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={processing || Boolean(fileClientError) || isOffline}
                                className="w-full py-4 px-6 text-sm sm:text-base font-bold bg-[#216B49] hover:bg-[#174B35] text-white rounded-xl shadow-[0_4px_16px_rgba(33,107,73,0.3)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-[0.99]"
                            >
                                <Send className="size-4" />
                                <span>
                                    {isOffline
                                        ? 'Menunggu Koneksi Internet (Draf Tersimpan)'
                                        : processing
                                          ? 'Sedang Mendaftarkan Laporan...'
                                          : 'Kirim Laporan Resmi Karhutla'}
                                </span>
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
