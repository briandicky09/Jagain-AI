import time

from app.core.config import Settings, get_settings
from app.models.vision_model import VisionModelAdapter, get_vision_adapter
from app.schemas.vision import VisionAnalyzeResponse


class VisionService:
    """Service orchestrating safe image validation and vision adapter inference."""

    def __init__(
        self,
        adapter: VisionModelAdapter | None = None,
        settings: Settings | None = None,
    ) -> None:
        self._settings = settings or get_settings()
        self._adapter = adapter or get_vision_adapter(self._settings)

    def analyze_bytes(self, raw_bytes: bytes) -> VisionAnalyzeResponse:
        start = time.perf_counter()
        result = self._adapter.analyze(raw_bytes)
        elapsed_ms = round((time.perf_counter() - start) * 1000, 2)
        return VisionAnalyzeResponse(
            schema_version="1.0",
            result=result,
            processing_duration_ms=elapsed_ms,
        )
