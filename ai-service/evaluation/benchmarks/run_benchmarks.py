"""Reproducible benchmark runner executing real pretrained models and saving actual metrics."""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.core.config import Settings  # noqa: E402
from app.schemas.evaluation import EvaluationRunRequest  # noqa: E402
from app.services.evaluation_service import EvaluationService  # noqa: E402
from evaluation.datasets.generate_synthetic_images import create_synthetic_images  # noqa: E402


def main() -> None:
    create_synthetic_images()
    settings = Settings(
        ai_embedding_backend="sentence_transformer",
        ai_vision_backend="clip",
        ai_ner_backend="heuristic",
    )
    service = EvaluationService(settings=settings)
    report = service.run_all(
        EvaluationRunRequest(
            modules=["triage", "deduplication", "privacy", "vision"],
            split="test",
        )
    )
    print(report.model_dump_json(indent=2))


if __name__ == "__main__":
    main()
