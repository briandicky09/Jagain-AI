from fastapi import APIRouter, Depends, Header

from app.core.config import Settings, get_settings
from app.core.security import require_service_auth
from app.core.telemetry import telemetry
from app.models.embedding_model import get_embedding_adapter
from app.models.ner_model import get_ner_adapter
from app.models.vision_model import get_vision_adapter
from app.schemas.common import HealthResponse, ModelStatusInfo

router = APIRouter(tags=["Health"])


@router.get("/health", response_model=HealthResponse)
def health_check(
    x_ai_service_secret: str | None = Header(default=None, alias="X-AI-Service-Secret"),
    settings: Settings = Depends(get_settings),
) -> HealthResponse:
    """Public minimal liveness probe; authenticated callers also receive model & telemetry diagnostics."""
    import hmac

    is_authenticated = bool(
        x_ai_service_secret
        and hmac.compare_digest(
            x_ai_service_secret.encode("utf-8"),
            settings.ai_service_secret.encode("utf-8"),
        )
    )

    if not is_authenticated:
        return HealthResponse(
            status="ok",
            service=settings.ai_app_name,
            environment="restricted" if settings.ai_env == "production" else settings.ai_env,
        )

    vision_status = ModelStatusInfo(**get_vision_adapter(settings).status())
    embed_status = ModelStatusInfo(**get_embedding_adapter(settings).status())
    ner_status = ModelStatusInfo(**get_ner_adapter(settings).status())

    return HealthResponse(
        status="ok",
        service=settings.ai_app_name,
        environment=settings.ai_env,
        models={
            "vision": vision_status,
            "embedding": embed_status,
            "ner": ner_status,
        },
        telemetry=telemetry.snapshot(),
    )


@router.get("/health/diagnostics", response_model=HealthResponse, dependencies=[Depends(require_service_auth)])
def authenticated_diagnostics(settings: Settings = Depends(get_settings)) -> HealthResponse:
    """Authenticated endpoint returning model status and inference telemetry."""
    return HealthResponse(
        status="ok",
        service=settings.ai_app_name,
        environment=settings.ai_env,
        models={
            "vision": ModelStatusInfo(**get_vision_adapter(settings).status()),
            "embedding": ModelStatusInfo(**get_embedding_adapter(settings).status()),
            "ner": ModelStatusInfo(**get_ner_adapter(settings).status()),
        },
        telemetry=telemetry.snapshot(),
    )
