import math
import time

from app.core.config import Settings, get_settings
from app.models.embedding_model import EmbeddingModelAdapter, get_embedding_adapter
from app.repositories.vector_repository import cosine_similarity, haversine_distance_meters
from app.schemas.common import ConfidenceType, DuplicateRecommendation
from app.schemas.deduplication import (
    DeduplicationRequest,
    DeduplicationResponse,
    DuplicateCandidateResult,
)


class DeduplicationService:
    """Semantic + geospatial + temporal + category duplicate candidate scoring."""

    def __init__(
        self,
        adapter: EmbeddingModelAdapter | None = None,
        settings: Settings | None = None,
    ) -> None:
        self._settings = settings or get_settings()
        self._adapter = adapter or get_embedding_adapter(self._settings)

    @staticmethod
    def _build_text(title: str, description: str, category: str | None) -> str:
        parts = [title.strip(), description.strip()]
        if category:
            parts.append(f"Kategori: {category.strip()}")
        return " ".join(parts)

    def _geo_score(self, distance_meters: float) -> float:
        # Smooth exponential decay: 0m -> 1.0, 1km -> ~0.82, 5km -> ~0.37, 25km -> ~0.007
        scale_m = max(1000.0, self._settings.ai_dedup_max_radius_meters / 5.0)
        return round(max(0.0, min(1.0, math.exp(-distance_meters / scale_m))), 4)

    def _time_score(self, time_diff_minutes: float) -> float:
        # Exponential decay over configurable time window (default 72h -> scale 12h)
        scale_min = max(60.0, self._settings.ai_dedup_max_time_minutes / 6.0)
        return round(max(0.0, min(1.0, math.exp(-time_diff_minutes / scale_min))), 4)

    @staticmethod
    def _category_score(cat_a: str | None, cat_b: str | None) -> float:
        if not cat_a or not cat_b:
            return 0.5
        if cat_a.strip().lower() == cat_b.strip().lower():
            return 1.0
        return 0.25

    def analyze(self, req: DeduplicationRequest) -> DeduplicationResponse:
        start = time.perf_counter()

        source_text = self._build_text(
            req.source_report.title,
            req.source_report.description,
            req.source_report.category,
        )
        source_vec = req.source_report.embedding_vector or self._adapter.embed(source_text)
        source_hash = self._adapter.content_hash(source_text)

        likely_threshold = (
            req.likely_threshold if req.likely_threshold is not None else self._settings.ai_dedup_likely_threshold
        )
        possible_threshold = (
            req.possible_threshold if req.possible_threshold is not None else self._settings.ai_dedup_possible_threshold
        )

        w_sem = self._settings.ai_dedup_weight_semantic
        w_geo = self._settings.ai_dedup_weight_geo
        w_time = self._settings.ai_dedup_weight_time
        w_cat = self._settings.ai_dedup_weight_category
        weight_sum = max(1e-6, w_sem + w_geo + w_time + w_cat)

        results: list[DuplicateCandidateResult] = []

        for cand in req.candidates:
            if cand.report_id == req.source_report.report_id:
                continue

            cand_text = self._build_text(cand.title, cand.description, cand.category)
            cand_vec = cand.embedding_vector or self._adapter.embed(cand_text)

            sem_sim = round(cosine_similarity(source_vec, cand_vec), 4)
            dist_m = round(
                haversine_distance_meters(
                    req.source_report.latitude,
                    req.source_report.longitude,
                    cand.latitude,
                    cand.longitude,
                ),
                1,
            )
            time_diff_min = round(
                abs((req.source_report.created_at - cand.created_at).total_seconds()) / 60.0,
                1,
            )

            geo_score = self._geo_score(dist_m)
            time_score = self._time_score(time_diff_min)
            cat_score = self._category_score(req.source_report.category, cand.category)

            combined = round(
                max(
                    0.0,
                    min(
                        1.0,
                        (w_sem * sem_sim + w_geo * geo_score + w_time * time_score + w_cat * cat_score) / weight_sum,
                    ),
                ),
                4,
            )

            # Geospatial guard: never mark far-away reports (> max radius) as LIKELY_DUPLICATE solely on text
            if len(cand.description.strip()) < 10 and len(req.source_report.description.strip()) < 10:
                recommendation = DuplicateRecommendation.INSUFFICIENT_INFORMATION
            elif dist_m > self._settings.ai_dedup_max_radius_meters:
                recommendation = DuplicateRecommendation.UNRELATED
            elif combined >= likely_threshold and dist_m <= 5000.0:
                recommendation = DuplicateRecommendation.LIKELY_DUPLICATE
            elif combined >= possible_threshold:
                recommendation = DuplicateRecommendation.POSSIBLE_DUPLICATE
            else:
                recommendation = DuplicateRecommendation.UNRELATED

            explanation = (
                f"Kemiripan semantik {sem_sim:.2f}, jarak {dist_m:.0f} m, "
                f"selisih waktu {time_diff_min:.0f} menit, kecocokan kategori {cat_score:.2f}."
            )

            results.append(
                DuplicateCandidateResult(
                    report_id=cand.report_id,
                    semantic_similarity=sem_sim,
                    geospatial_score=geo_score,
                    temporal_score=time_score,
                    category_score=cat_score,
                    distance_meters=dist_m,
                    time_difference_minutes=time_diff_min,
                    duplicate_probability=combined,
                    score_type=ConfidenceType.SIMILARITY_SCORE,
                    recommendation=recommendation,
                    explanation=explanation,
                )
            )

        results.sort(key=lambda item: item.duplicate_probability, reverse=True)
        elapsed_ms = round((time.perf_counter() - start) * 1000, 2)

        return DeduplicationResponse(
            schema_version="1.0",
            source_report=req.source_report.report_id,
            embedding_model=self._adapter.model_name,
            model_version=self._adapter.model_version,
            dimensions=self._adapter.dimensions,
            is_pretrained_ml=self._adapter.is_pretrained_ml,
            source_embedding=source_vec,
            source_content_hash=source_hash,
            potential_duplicates=results,
            processing_duration_ms=elapsed_ms,
        )
