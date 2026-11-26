import base64
import binascii
import re
import time

from app.core.config import Settings, get_settings
from app.models.vision_model import VisionModelAdapter, get_vision_adapter
from app.schemas.common import (
    ConfidenceType,
    ImageQuality,
    IncidentCategoryGuess,
    SeverityRecommendation,
)
from app.schemas.triage import (
    ConsistencyResult,
    TextAnalysisResult,
    TriageRequest,
    TriageResponse,
)
from app.schemas.vision import ImageAnalysisResult

SMOKE_KEYWORDS = ("asap", "kepulan", "mengepul", "kabut asap", "asap putih", "asap hitam", "asap pekat")
FLAME_KEYWORDS = ("api", "nyala api", "kobaran", "membakar", "terbakar", "jilatan api", "api membesar")
EMBER_KEYWORDS = ("bara", "bara api", "titik api", "percikan")
ASH_KEYWORDS = ("abu", "arang", "hangus", "bekas terbakar")
SPREAD_KEYWORDS = ("meluas", "menjalar", "cepat", "angin kencang", "membesar", "tidak terkendali", "merambat")
SETTLEMENT_KEYWORDS = (
    "pemukiman",
    "permukiman",
    "rumah warga",
    "sekolah",
    "puskesmas",
    "kampung",
    "perumahan",
    "jalan poros",
)
VISIBILITY_KEYWORDS = ("jarak pandang", "pandangan terbatas", "sesak napas", "ispa", "menutupi jalan")

PEAT_KEYWORDS = ("gambut", "lahan gambut")
FOREST_KEYWORDS = ("hutan lindung", "taman nasional", "hutan", "suaka", "kawasan hutan", "konservasi")
PLANTATION_KEYWORDS = ("perkebunan", "sawit", "karet", "kebun", "ladang", "konsesi")
BRUSH_KEYWORDS = ("semak", "belukar", "ilalang", "alang-alang", "rumput kering", "lahan kosong")

NEGATED_FLAME_RE = re.compile(r"\b(?:tanpa|tidak\s+ada|bukan)\s+(?:kobaran\s+|nyala\s+|titik\s+)?api\b")
NEGATED_SETTLEMENT_RE = re.compile(
    r"\b(?:jauh\s+dari|tidak\s+dekat|bukan\s+dekat)\s+(?:permukiman|pemukiman|rumah\s+warga|kampung)\b"
)

WIND_KEYWORDS = ("angin kencang", "angin bertiup", "angin kuat")
DRY_KEYWORDS = ("kemarau", "kering", "panas terik", "kekeringan", "tidak hujan")
HAZE_KEYWORDS = ("kabut asap", "bau asap", "asap tebal", "asap pekat")
RAIN_KEYWORDS = ("hujan", "gerimis", "basah")

NON_WILDFIRE_HINTS = ("uji coba sistem", "test aja", "salah kirim", "kebakaran dapur", "korsleting rumah", "kompor")
EXTENT_HINTS = ("hektar", "ha", "meter", "km", "luas", "radius", "sekitar")
LANDMARK_HINTS = ("km ", "desa", "dusun", "parit", "jl", "jalan", "dekat", "kecamatan", "kabupaten", "patok")


def _contains_any(text: str, keywords: tuple[str, ...]) -> bool:
    return any(kw in text for kw in keywords)


class TriageService:
    """Multimodal wildfire report triage combining Indonesian text extraction & CLIP visual evidence."""

    MODEL_NAME = "jagain-multimodal-triage-rules+clip"
    MODEL_VERSION = "1.0.0"

    def __init__(
        self,
        vision_adapter: VisionModelAdapter | None = None,
        settings: Settings | None = None,
    ) -> None:
        self._settings = settings or get_settings()
        self._vision_adapter = vision_adapter or get_vision_adapter(self._settings)

    def analyze_text(self, req: TriageRequest) -> TextAnalysisResult:
        combined = " ".join(
            part
            for part in [
                req.title,
                req.description,
                req.category or "",
                req.location_description or "",
                req.additional_information or "",
            ]
            if part
        ).lower()

        fire_indicators: list[str] = []
        smoke_mentioned = _contains_any(combined, SMOKE_KEYWORDS)
        combined_without_negated_flames = NEGATED_FLAME_RE.sub(" ", combined)
        flames_mentioned = _contains_any(combined_without_negated_flames, FLAME_KEYWORDS)

        combined_without_negated_settlement = NEGATED_SETTLEMENT_RE.sub(" ", combined)
        near_settlement = _contains_any(combined_without_negated_settlement, SETTLEMENT_KEYWORDS)

        if smoke_mentioned:
            fire_indicators.append("smoke_mentioned")
        if flames_mentioned:
            fire_indicators.append("flames_mentioned")
        if _contains_any(combined, EMBER_KEYWORDS):
            fire_indicators.append("embers_mentioned")
        if _contains_any(combined, ASH_KEYWORDS):
            fire_indicators.append("ash_or_char_mentioned")
        if _contains_any(combined, SPREAD_KEYWORDS):
            fire_indicators.append("rapid_spread_mentioned")
        if near_settlement:
            fire_indicators.append("near_settlement_mentioned")
        if _contains_any(combined, VISIBILITY_KEYWORDS):
            fire_indicators.append("visibility_or_health_impact")

        vegetation_types: list[str] = []
        if _contains_any(combined, PEAT_KEYWORDS):
            vegetation_types.append("lahan_gambut")
        if _contains_any(combined, FOREST_KEYWORDS):
            vegetation_types.append("hutan_lindung")
        if _contains_any(combined, PLANTATION_KEYWORDS):
            vegetation_types.append("perkebunan")
        if _contains_any(combined, BRUSH_KEYWORDS):
            vegetation_types.append("semak_belukar")

        weather_conditions: list[str] = []
        if _contains_any(combined, WIND_KEYWORDS):
            weather_conditions.append("angin_kencang")
        if _contains_any(combined, DRY_KEYWORDS):
            weather_conditions.append("kemarau_kering")
        if _contains_any(combined, HAZE_KEYWORDS):
            weather_conditions.append("kabut_asap")
        if _contains_any(combined, RAIN_KEYWORDS):
            weather_conditions.append("hujan")

        urgency_indicators: list[str] = []
        if _contains_any(combined, SETTLEMENT_KEYWORDS):
            urgency_indicators.append("dekat_permukiman_atau_fasilitas")
        if _contains_any(combined, SPREAD_KEYWORDS):
            urgency_indicators.append("potensi_penjalaran_cepat")
        if "lahan_gambut" in vegetation_types:
            urgency_indicators.append("risiko_api_bawah_permukaan_gambut")
        if _contains_any(combined, VISIBILITY_KEYWORDS):
            urgency_indicators.append("gangguan_jarak_pandang_atau_pernapasan")

        # Potential category
        if _contains_any(combined, NON_WILDFIRE_HINTS) and not vegetation_types:
            potential_category = IncidentCategoryGuess.NON_WILDFIRE
        elif "lahan_gambut" in vegetation_types:
            potential_category = IncidentCategoryGuess.PEATLAND_FIRE
        elif "hutan_lindung" in vegetation_types:
            potential_category = IncidentCategoryGuess.FOREST_FIRE
        elif "perkebunan" in vegetation_types:
            potential_category = IncidentCategoryGuess.PLANTATION_FIRE
        elif "semak_belukar" in vegetation_types:
            potential_category = IncidentCategoryGuess.BRUSH_FIRE
        elif fire_indicators:
            potential_category = IncidentCategoryGuess.LAND_FIRE
        else:
            potential_category = IncidentCategoryGuess.UNCLEAR

        # Missing information checks
        missing_info: list[str] = []
        if not re.search(r"\b\d+(\.\d+)?\s*(ha|hektar|m2|meter)\b", combined) and not _contains_any(
            combined, ("luas", "ukuran", "lebar")
        ):
            missing_info.append("fire_extent")
        if req.reported_occurrence_at is None:
            missing_info.append("occurrence_time")
        if (
            not req.location_description
            or len(req.location_description.strip()) < 10
            or not _contains_any(combined, LANDMARK_HINTS)
        ):
            missing_info.append("specific_landmark")
        if not req.has_evidence_image and not req.image_base64:
            missing_info.append("evidence_photo")
        if not fire_indicators:
            missing_info.append("wildfire_visual_or_sensory_details")

        inconsistencies: list[str] = []
        if (
            _contains_any(combined, ("padam", "sudah mati"))
            and flames_mentioned
            and not _contains_any(combined, ("sebelumnya", "tadi"))
        ):
            inconsistencies.append("teks_menyebut_api_aktif_dan_padam_bersamaan")

        return TextAnalysisResult(
            potential_category=potential_category,
            fire_indicators=fire_indicators,
            vegetation_or_land_types=vegetation_types,
            weather_conditions=weather_conditions,
            urgency_indicators=urgency_indicators,
            smoke_mentioned=smoke_mentioned,
            flames_mentioned=flames_mentioned,
            missing_information=missing_info,
            inconsistencies=inconsistencies,
        )

    def _analyze_optional_image(self, req: TriageRequest) -> ImageAnalysisResult:
        if not req.image_base64:
            return ImageAnalysisResult(
                analyzed=False,
                adapter_status="NO_IMAGE_PROVIDED",
                model_name=self._vision_adapter.model_name,
                model_version=self._vision_adapter.model_version,
                image_quality=ImageQuality.UNAVAILABLE,
                observation_note="Pelapor tidak melampirkan bukti foto pada laporan ini.",
                limitations="Tidak ada bukti visual untuk diperiksa; penilaian hanya didasarkan pada teks.",
            )
        try:
            payload = req.image_base64.split(",", 1)[-1]
            raw_bytes = base64.b64decode(payload, validate=True)
        except (binascii.Error, ValueError):
            return ImageAnalysisResult(
                analyzed=False,
                adapter_status="INVALID_IMAGE_PAYLOAD",
                model_name=self._vision_adapter.model_name,
                model_version=self._vision_adapter.model_version,
                image_quality=ImageQuality.POOR,
                observation_note="Lampiran gambar tidak dapat didekode secara aman.",
                limitations="Format base64 atau file gambar rusak.",
            )

        try:
            return self._vision_adapter.analyze(raw_bytes)
        except ValueError as exc:
            return ImageAnalysisResult(
                analyzed=False,
                adapter_status="IMAGE_VALIDATION_FAILED",
                model_name=self._vision_adapter.model_name,
                model_version=self._vision_adapter.model_version,
                image_quality=ImageQuality.POOR,
                observation_note=f"Gambar ditolak saat validasi keamanan: {exc}",
                limitations="Gambar tidak memenuhi batas ukuran atau format yang diizinkan.",
            )

    def _evaluate_consistency(
        self,
        text_res: TextAnalysisResult,
        image_res: ImageAnalysisResult,
    ) -> ConsistencyResult:
        if not image_res.analyzed:
            return ConsistencyResult(
                text_image_consistent=None,
                consistency_status="NOT_EVALUATED",
                notes=(
                    "Konsistensi teks-foto belum dapat dievaluasi karena foto tidak "
                    "tersedia atau adapter visi tidak aktif."
                ),
            )

        if image_res.appears_unrelated and (text_res.smoke_mentioned or text_res.flames_mentioned):
            return ConsistencyResult(
                text_image_consistent=False,
                consistency_status="TEXT_IMAGE_MISMATCH",
                notes=(
                    "Teks melaporkan indikasi karhutla, namun observasi visual menilai "
                    "gambar tampak tidak terkait kejadian karhutla."
                ),
            )

        visual_fire_signal = (
            image_res.smoke_detected or image_res.flame_detected or image_res.burned_vegetation_detected
        )
        if (text_res.smoke_mentioned or text_res.flames_mentioned) and visual_fire_signal:
            return ConsistencyResult(
                text_image_consistent=True,
                consistency_status="CONSISTENT",
                notes=(
                    "Deskripsi teks dan observasi visual sama-sama menunjukkan "
                    "indikasi asap, api, atau vegetasi terbakar."
                ),
            )

        if text_res.potential_category == IncidentCategoryGuess.NON_WILDFIRE and image_res.appears_unrelated:
            return ConsistencyResult(
                text_image_consistent=True,
                consistency_status="CONSISTENT_NON_WILDFIRE",
                notes="Teks dan citra sama-sama mengindikasikan konten non-karhutla.",
            )

        if visual_fire_signal and not (text_res.smoke_mentioned or text_res.flames_mentioned):
            return ConsistencyResult(
                text_image_consistent=True,
                consistency_status="VISUAL_STRONGER_THAN_TEXT",
                notes="Citra menunjukkan indikasi visual kebakaran meskipun deskripsi teks masih singkat.",
            )

        return ConsistencyResult(
            text_image_consistent=False,
            consistency_status="AMBIGUOUS_EVIDENCE",
            notes="Bukti foto tidak menunjukkan indikator asap atau api yang jelas dibandingkan deskripsi teks.",
        )

    def _recommend_severity(
        self,
        text_res: TextAnalysisResult,
        image_res: ImageAnalysisResult,
        consistency: ConsistencyResult,
    ) -> tuple[SeverityRecommendation, list[str], list[str], float]:
        rationale: list[str] = []
        flags: list[str] = ["LOCATION_REQUIRES_VERIFICATION"]

        if text_res.potential_category == IncidentCategoryGuess.NON_WILDFIRE and not (
            image_res.smoke_detected or image_res.flame_detected
        ):
            rationale.append(
                "Teks mengandung indikasi laporan uji coba atau non-karhutla tanpa indikator visual kebakaran."
            )
            flags.append("POTENTIAL_NON_WILDFIRE_OR_TEST")
            return SeverityRecommendation.LOW, rationale, flags, 0.72

        if text_res.potential_category == IncidentCategoryGuess.UNCLEAR and not image_res.analyzed:
            rationale.append(
                "Deskripsi tidak memuat indikator asap, api, atau vegetasi yang jelas serta tidak ada foto teranalisis."
            )
            flags.append("INSUFFICIENT_DETAILS_FOR_TRIAGE")
            return SeverityRecommendation.UNKNOWN, rationale, flags, 0.45

        score = 0
        if text_res.flames_mentioned:
            score += 2
            rationale.append("Deskripsi menyebutkan adanya nyala/titik api aktif (+2).")
        if text_res.smoke_mentioned:
            score += 1
            rationale.append("Deskripsi menyebutkan kepulan atau kabut asap (+1).")
        if "lahan_gambut" in text_res.vegetation_or_land_types:
            score += 2
            rationale.append("Melibatkan lahan gambut yang berisiko kebakaran bawah permukaan (+2).")
            flags.append("PEATLAND_RISK_PRIORITY")
        if "near_settlement_mentioned" in text_res.fire_indicators:
            score += 2
            rationale.append("Lokasi dilaporkan dekat permukiman atau fasilitas umum (+2).")
            flags.append("NEAR_SETTLEMENT_ALERT")
        if "rapid_spread_mentioned" in text_res.fire_indicators or "angin_kencang" in text_res.weather_conditions:
            score += 1
            rationale.append("Terdapat indikasi penjalaran cepat atau angin kencang (+1).")
        if "visibility_or_health_impact" in text_res.fire_indicators and (
            text_res.flames_mentioned or "rapid_spread_mentioned" in text_res.fire_indicators
        ):
            score += 1
            rationale.append("Asap mengganggu jarak pandang atau keselamatan pengguna jalan/warga (+1).")
        if image_res.analyzed and image_res.flame_detected:
            score += 2
            rationale.append("Observasi visual CLIP mendeteksi indikasi nyala api (+2).")
        elif image_res.analyzed and image_res.smoke_detected:
            score += 1
            rationale.append("Observasi visual CLIP mendeteksi indikasi asap (+1).")

        if image_res.analyzed and image_res.appears_unrelated:
            flags.append("IMAGE_APPEARS_UNRELATED")
            rationale.append("Foto tampak tidak terkait karhutla; tingkat keparahan perlu verifikasi manual.")
        if image_res.image_quality == ImageQuality.POOR:
            flags.append("POOR_IMAGE_QUALITY")
        if consistency.text_image_consistent is False:
            flags.append("TEXT_IMAGE_INCONSISTENCY")
        if text_res.missing_information:
            flags.append("MISSING_CONTEXT_FIELDS")

        if score >= 6:
            severity = SeverityRecommendation.CRITICAL
        elif score >= 4:
            severity = SeverityRecommendation.HIGH
        elif score >= 2:
            severity = SeverityRecommendation.MEDIUM
        elif score >= 1:
            severity = SeverityRecommendation.LOW
        else:
            severity = SeverityRecommendation.UNKNOWN

        if not rationale:
            rationale.append("Penilaian awal berdasarkan informasi minimum laporan.")

        # Rule coverage completeness score (explicitly labeled RULE_BASED, NOT calibrated probability)
        signal_coverage = 0.55
        if text_res.fire_indicators:
            signal_coverage += 0.15
        if text_res.vegetation_or_land_types:
            signal_coverage += 0.10
        if image_res.analyzed:
            signal_coverage += 0.12
        if consistency.text_image_consistent is False:
            signal_coverage -= 0.18
        if len(text_res.missing_information) >= 3:
            signal_coverage -= 0.10
        rule_confidence = round(max(0.25, min(0.92, signal_coverage)), 2)

        return severity, rationale, flags, rule_confidence

    def analyze(self, req: TriageRequest) -> TriageResponse:
        start = time.perf_counter()

        text_res = self.analyze_text(req)
        image_res = self._analyze_optional_image(req)
        consistency = self._evaluate_consistency(text_res, image_res)
        severity, rationale, flags, confidence = self._recommend_severity(text_res, image_res, consistency)

        veg_label = ", ".join(v.replace("_", " ") for v in text_res.vegetation_or_land_types) or "lahan belum spesifik"
        cat_label = text_res.potential_category.value.lower().replace("_", " ")
        summary_parts = [f"Ringkasan triase AI: indikasi {cat_label} pada {veg_label}."]
        if text_res.flames_mentioned:
            summary_parts.append("Pelapor menyebutkan nyala api.")
        elif text_res.smoke_mentioned:
            summary_parts.append("Pelapor menyebutkan adanya asap.")
        if image_res.analyzed:
            summary_parts.append(image_res.observation_note)
        summary_parts.append("Memerlukan verifikasi resmi administrator JAGAIN.")

        elapsed_ms = round((time.perf_counter() - start) * 1000, 2)

        return TriageResponse(
            analysis_version="1.0",
            schema_version="1.0",
            report_id=req.report_id,
            incident_category=text_res.potential_category,
            severity_recommendation=severity,
            severity_rationale=rationale,
            summary=" ".join(summary_parts)[:1000],
            text_analysis=text_res,
            image_analysis=image_res,
            consistency=consistency,
            verification_flags=flags,
            confidence=confidence,
            confidence_type=ConfidenceType.RULE_BASED,
            confidence_explanation=(
                "Skor rule-based yang mengukur kelengkapan sinyal teks & bukti visual "
                "(bukan probabilitas terkalibrasi)."
            ),
            requires_human_review=True,
            model_name=self.MODEL_NAME,
            model_version=self.MODEL_VERSION,
            processing_duration_ms=elapsed_ms,
        )
