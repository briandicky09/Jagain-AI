import time

from app.core.config import Settings, get_settings
from app.models.embedding_model import EmbeddingModelAdapter, get_embedding_adapter
from app.schemas.deduplication import EmbeddingRequest, EmbeddingResponse


class EmbeddingService:
    """Generates semantic embeddings and tracks model version + content hash."""

    def __init__(
        self,
        adapter: EmbeddingModelAdapter | None = None,
        settings: Settings | None = None,
    ) -> None:
        self._settings = settings or get_settings()
        self._adapter = adapter or get_embedding_adapter(self._settings)

    def embed_report(self, req: EmbeddingRequest) -> EmbeddingResponse:
        start = time.perf_counter()
        vector = self._adapter.embed(req.text)
        content_hash = self._adapter.content_hash(req.text)
        elapsed_ms = round((time.perf_counter() - start) * 1000, 2)
        return EmbeddingResponse(
            schema_version="1.0",
            report_id=req.report_id,
            embedding_model=self._adapter.model_name,
            model_version=self._adapter.model_version,
            dimensions=self._adapter.dimensions,
            content_hash=content_hash,
            is_pretrained_ml=self._adapter.is_pretrained_ml,
            vector=vector,
            processing_duration_ms=elapsed_ms,
        )
