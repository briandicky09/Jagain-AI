from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from app.core.config import Settings, get_settings
from app.core.security import require_service_auth
from app.core.telemetry import telemetry
from app.schemas.vision import VisionAnalyzeResponse
from app.services.vision_service import VisionService

router = APIRouter(prefix="/vision", tags=["Vision Evidence"])


@router.post(
    "/analyze",
    response_model=VisionAnalyzeResponse,
    dependencies=[Depends(require_service_auth)],
)
async def analyze_vision(
    file: UploadFile = File(...),
    settings: Settings = Depends(get_settings),
) -> VisionAnalyzeResponse:
    raw = await file.read(settings.ai_max_image_bytes + 1)
    if len(raw) > settings.ai_max_image_bytes:
        telemetry.record_error()
        raise HTTPException(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
            detail={
                "code": "IMAGE_TOO_LARGE",
                "message": f"Uploaded image exceeds max limit of {settings.ai_max_image_bytes} bytes.",
            },
        )

    service = VisionService(settings=settings)
    try:
        response = service.analyze_bytes(raw)
        telemetry.record_success(response.processing_duration_ms)
        return response
    except ValueError as exc:
        telemetry.record_error()
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail={
                "code": "INVALID_IMAGE",
                "message": str(exc),
            },
        ) from exc
