import os
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

os.environ.setdefault("AI_ENV", "test")
os.environ.setdefault("AI_SERVICE_SECRET", "test-secret-123456")
os.environ.setdefault("AI_EMBEDDING_BACKEND", "lightweight")
os.environ.setdefault("AI_VISION_BACKEND", "unavailable")
os.environ.setdefault("AI_NER_BACKEND", "heuristic")

from app.core.config import get_settings  # noqa: E402
from app.core.security import rate_limiter  # noqa: E402
from app.core.telemetry import telemetry  # noqa: E402
from app.main import create_app  # noqa: E402
from app.models.embedding_model import reset_embedding_adapter  # noqa: E402
from app.models.ner_model import reset_ner_adapter  # noqa: E402
from app.models.vision_model import reset_vision_adapter  # noqa: E402


@pytest.fixture()
def auth_headers() -> dict[str, str]:
    return {"X-AI-Service-Secret": "test-secret-123456"}


@pytest.fixture()
def client() -> TestClient:
    get_settings.cache_clear()
    reset_embedding_adapter()
    reset_vision_adapter()
    reset_ner_adapter()
    rate_limiter.reset()
    telemetry.reset()
    app = create_app()
    return TestClient(app)
