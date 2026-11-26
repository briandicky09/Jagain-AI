import hashlib
import math
import re
import threading
from abc import ABC, abstractmethod
from typing import Any

from app.core.config import Settings, get_settings
from app.core.logging import get_logger

logger = get_logger("embedding_model")


class EmbeddingModelAdapter(ABC):
    """Abstract semantic text embedding adapter."""

    model_name: str
    model_version: str
    dimensions: int
    is_pretrained_ml: bool

    @abstractmethod
    def status(self) -> dict[str, Any]:
        """Return adapter metadata and readiness."""

    @abstractmethod
    def embed(self, text: str) -> list[float]:
        """Return L2-normalized embedding vector."""

    @staticmethod
    def content_hash(text: str) -> str:
        return hashlib.sha256(text.strip().encode("utf-8")).hexdigest()


class SentenceTransformerEmbeddingAdapter(EmbeddingModelAdapter):
    """Multilingual SentenceTransformer embedding adapter (384-dim for MiniLM)."""

    def __init__(self, model_name: str) -> None:
        self.model_name = model_name
        self.model_version = f"st-v1 ({model_name})"
        self.dimensions = 384
        self.is_pretrained_ml = True
        self._model: Any = None
        self._load_error: str | None = None
        self._load_lock = threading.Lock()

    def _ensure_loaded(self) -> None:
        if self._model is not None:
            return
        with self._load_lock:
            if self._model is not None:
                return
            try:
                from sentence_transformers import SentenceTransformer

                model = SentenceTransformer(self.model_name, device="cpu")
                dim = model.get_sentence_embedding_dimension()
                if isinstance(dim, int) and dim > 0:
                    self.dimensions = dim
                self._model = model
                logger.info(
                    "Loaded SentenceTransformer model",
                    extra={"structured_extra": {"model": self.model_name, "dimensions": self.dimensions}},
                )
            except Exception as exc:  # noqa: BLE001
                self._load_error = f"{type(exc).__name__}: {exc}"
                raise RuntimeError(f"Failed to load SentenceTransformer model: {self._load_error}") from exc

    def preload(self) -> bool:
        try:
            self._ensure_loaded()
            return True
        except RuntimeError:
            return False

    def status(self) -> dict[str, Any]:
        return {
            "name": self.model_name,
            "backend": "sentence_transformer",
            "status": "loaded" if self._model is not None else ("error" if self._load_error else "lazy_ready"),
            "is_pretrained_ml": True,
            "details": self._load_error or f"{self.dimensions}-dim normalized semantic embeddings (CPU).",
        }

    def embed(self, text: str) -> list[float]:
        self._ensure_loaded()
        vec = self._model.encode(text, normalize_embeddings=True, show_progress_bar=False)
        return [round(float(x), 6) for x in vec.tolist()]


class LightweightHashingEmbeddingAdapter(EmbeddingModelAdapter):
    """Deterministic character/word n-gram hashing embedder for offline unit tests only."""

    def __init__(self, dimensions: int = 384) -> None:
        self.model_name = "lightweight-hashing-ngram-test-only"
        self.model_version = "hashing-v1"
        self.dimensions = dimensions
        self.is_pretrained_ml = False

    def status(self) -> dict[str, Any]:
        return {
            "name": self.model_name,
            "backend": "lightweight",
            "status": "loaded",
            "is_pretrained_ml": False,
            "details": "Non-ML deterministic hashing projection for offline CI unit tests.",
        }

    def embed(self, text: str) -> list[float]:
        tokens = re.findall(r"[a-z0-9]{2,}", text.lower())
        grams: list[str] = list(tokens)
        for tok in tokens:
            if len(tok) >= 3:
                for i in range(len(tok) - 2):
                    grams.append(tok[i : i + 3])

        vec = [0.0] * self.dimensions
        for gram in grams:
            digest = hashlib.blake2b(gram.encode("utf-8"), digest_size=8).digest()
            idx = int.from_bytes(digest[:4], "little") % self.dimensions
            sign = 1.0 if (digest[4] & 1) == 0 else -1.0
            vec[idx] += sign

        norm = math.sqrt(sum(v * v for v in vec))
        if norm > 0:
            vec = [round(v / norm, 6) for v in vec]
        return vec


_embedding_adapter_instance: EmbeddingModelAdapter | None = None


def get_embedding_adapter(settings: Settings | None = None) -> EmbeddingModelAdapter:
    global _embedding_adapter_instance
    if _embedding_adapter_instance is not None:
        return _embedding_adapter_instance

    cfg = settings or get_settings()
    if cfg.ai_embedding_backend == "sentence_transformer":
        _embedding_adapter_instance = SentenceTransformerEmbeddingAdapter(cfg.ai_embedding_model)
    else:
        _embedding_adapter_instance = LightweightHashingEmbeddingAdapter(dimensions=384)
    return _embedding_adapter_instance


def reset_embedding_adapter() -> None:
    global _embedding_adapter_instance
    _embedding_adapter_instance = None
