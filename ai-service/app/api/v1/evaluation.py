from fastapi import APIRouter, Depends

from app.core.config import Settings, get_settings
from app.core.security import require_service_auth
from app.schemas.evaluation import EvaluationReportResponse, EvaluationRunRequest
from app.services.evaluation_service import EvaluationService

router = APIRouter(prefix="/evaluation", tags=["AI Evaluation"])


@router.post(
    "/run",
    response_model=EvaluationReportResponse,
    dependencies=[Depends(require_service_auth)],
)
def run_evaluation(
    payload: EvaluationRunRequest,
    settings: Settings = Depends(get_settings),
) -> EvaluationReportResponse:
    service = EvaluationService(settings=settings)
    return service.run_all(payload)
