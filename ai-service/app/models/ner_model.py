from abc import ABC, abstractmethod
from typing import Any

from app.core.config import Settings, get_settings
from app.core.logging import get_logger

logger = get_logger("ner_model")


class NerModelAdapter(ABC):
    """Abstract adapter for Indonesian named entity detection supporting PII guardrails."""

    model_name: str
    is_pretrained_ml: bool

    @abstractmethod
    def status(self) -> dict[str, Any]:
        """Return adapter readiness."""

    @abstractmethod
    def extract_person_spans(self, text: str) -> list[tuple[int, int, float, str]]:
        """Return list of (start, end, confidence, detector_tag) for person name candidates."""


class HeuristicIndonesianNerAdapter(NerModelAdapter):
    """Rule-assisted contextual detector (non-ML) used alongside regex and allowlists."""

    def __init__(self) -> None:
        self.model_name = "indonesian-contextual-pii-detector-v1"
        self.is_pretrained_ml = False

    def status(self) -> dict[str, Any]:
        return {
            "name": self.model_name,
            "backend": "heuristic",
            "status": "loaded",
            "is_pretrained_ml": False,
            "details": "Context-aware Indonesian PII detector (regex + structural validator + allowlist).",
        }

    def extract_person_spans(self, text: str) -> list[tuple[int, int, float, str]]:
        # Contextual person extraction is executed deterministically inside pii_service.
        return []


class TransformersNerAdapter(NerModelAdapter):
    """Optional Hugging Face token-classification NER adapter for Indonesian PERSON entities."""

    def __init__(self, model_name: str) -> None:
        self.model_name = model_name
        self.is_pretrained_ml = True
        self._pipeline: Any = None
        self._load_error: str | None = None

    def _ensure_loaded(self) -> bool:
        if self._pipeline is not None:
            return True
        if self._load_error is not None:
            return False
        try:
            from transformers import pipeline

            self._pipeline = pipeline(
                "token-classification",
                model=self.model_name,
                aggregation_strategy="simple",
                device=-1,
            )
            return True
        except Exception as exc:  # noqa: BLE001
            self._load_error = f"{type(exc).__name__}: {exc}"
            logger.warning(
                "NER transformer model failed to load; falling back to contextual rules",
                extra={"structured_extra": {"model": self.model_name, "error": self._load_error}},
            )
            return False

    def status(self) -> dict[str, Any]:
        return {
            "name": self.model_name,
            "backend": "transformers",
            "status": "loaded" if self._pipeline is not None else ("error" if self._load_error else "lazy_ready"),
            "is_pretrained_ml": True,
            "details": self._load_error or "Hugging Face Indonesian NER pipeline (CPU).",
        }

    def extract_person_spans(self, text: str) -> list[tuple[int, int, float, str]]:
        if not text.strip() or not self._ensure_loaded():
            return []

        results: list[tuple[int, int, float, str]] = []
        entities = self._pipeline(text)
        for ent in entities:
            group = str(ent.get("entity_group", "")).upper()
            if group in {"PER", "PERSON"}:
                start = int(ent["start"])
                end = int(ent["end"])
                score = float(ent.get("score", 0.7))
                if end > start and score >= 0.72:
                    results.append((start, end, round(min(1.0, score), 4), "hf_ner"))
        return results


_ner_adapter_instance: NerModelAdapter | None = None


def get_ner_adapter(settings: Settings | None = None) -> NerModelAdapter:
    global _ner_adapter_instance
    if _ner_adapter_instance is not None:
        return _ner_adapter_instance

    cfg = settings or get_settings()
    if cfg.ai_ner_backend == "transformers":
        _ner_adapter_instance = TransformersNerAdapter(cfg.ai_ner_model)
    else:
        _ner_adapter_instance = HeuristicIndonesianNerAdapter()
    return _ner_adapter_instance


def reset_ner_adapter() -> None:
    global _ner_adapter_instance
    _ner_adapter_instance = None
