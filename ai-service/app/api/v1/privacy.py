from fastapi import APIRouter, Depends

from app.core.config import Settings, get_settings
from app.core.logging import get_logger
from app.core.security import require_service_auth
from app.core.telemetry import telemetry
from app.schemas.privacy import PrivacyRedactRequest, PrivacyRedactResponse
from app.services.pii_service import PiiRedactionService

router = APIRouter(prefix="/privacy", tags=["Privacy & PII Guardrails"])
logger = get_logger("api.privacy")


@router.post(
    "/redact",
    response_model=PrivacyRedactResponse,
    dependencies=[Depends(require_service_auth)],
)
def redact_pii(
    payload: PrivacyRedactRequest,
    settings: Settings = Depends(get_settings),
) -> PrivacyRedactResponse:
    service = PiiRedactionService(settings=settings)
    try:
        res = service.redact(payload)
        telemetry.record_success(res.processing_duration_ms)
        logger.info(
            "Privacy redaction completed",
            extra={
                "structured_extra": {
                    "report_id": payload.report_id,
                    "pii_detected": res.pii_detected,
                    "entity_counts": res.entity_counts,
                    "duration_ms": res.processing_duration_ms,
                }
            },
        )
        return res
    except Exception:
        telemetry.record_error()
        raise
