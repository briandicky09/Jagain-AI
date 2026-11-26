from fastapi import APIRouter, Depends

from app.core.config import Settings, get_settings
from app.core.logging import get_logger
from app.core.security import require_service_auth
from app.core.telemetry import telemetry
from app.schemas.deduplication import (
    DeduplicationRequest,
    DeduplicationResponse,
    EmbeddingRequest,
    EmbeddingResponse,
)
from app.services.deduplication_service import DeduplicationService
from app.services.embedding_service import EmbeddingService

router = APIRouter(prefix="/deduplication", tags=["Semantic & Geospatial Deduplication"])
logger = get_logger("api.deduplication")


@router.post(
    "/embed",
    response_model=EmbeddingResponse,
    dependencies=[Depends(require_service_auth)],
)
def generate_embedding(
    payload: EmbeddingRequest,
    settings: Settings = Depends(get_settings),
) -> EmbeddingResponse:
    service = EmbeddingService(settings=settings)
    try:
        res = service.embed_report(payload)
        telemetry.record_success(res.processing_duration_ms)
        return res
    except Exception:
        telemetry.record_error()
        raise


@router.post(
    "/analyze",
    response_model=DeduplicationResponse,
    dependencies=[Depends(require_service_auth)],
)
def analyze_duplicates(
    payload: DeduplicationRequest,
    settings: Settings = Depends(get_settings),
) -> DeduplicationResponse:
    service = DeduplicationService(settings=settings)
    try:
        res = service.analyze(payload)
        telemetry.record_success(res.processing_duration_ms)
        logger.info(
            "Deduplication analysis completed",
            extra={
                "structured_extra": {
                    "source_report": payload.source_report.report_id,
                    "candidate_count": len(payload.candidates),
                    "duration_ms": res.processing_duration_ms,
                }
            },
        )
        return res
    except Exception:
        telemetry.record_error()
        raise
