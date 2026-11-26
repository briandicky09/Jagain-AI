from fastapi import APIRouter, Depends

from app.core.config import Settings, get_settings
from app.core.logging import get_logger
from app.core.security import require_service_auth
from app.core.telemetry import telemetry
from app.schemas.triage import TriageRequest, TriageResponse
from app.services.triage_service import TriageService

router = APIRouter(prefix="/triage", tags=["Multimodal Triage"])
logger = get_logger("api.triage")


@router.post(
    "/analyze",
    response_model=TriageResponse,
    dependencies=[Depends(require_service_auth)],
)
def analyze_triage(
    payload: TriageRequest,
    settings: Settings = Depends(get_settings),
) -> TriageResponse:
    service = TriageService(settings=settings)
    try:
        result = service.analyze(payload)
        telemetry.record_success(result.processing_duration_ms)
        logger.info(
            "Triage analysis completed",
            extra={
                "structured_extra": {
                    "report_id": payload.report_id,
                    "severity_recommendation": result.severity_recommendation.value,
                    "duration_ms": result.processing_duration_ms,
                }
            },
        )
        return result
    except Exception:
        telemetry.record_error()
        raise
