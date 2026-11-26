import json
import logging
from concurrent.futures import ThreadPoolExecutor
from io import BytesIO

import pytest
from fastapi.testclient import TestClient
from PIL import Image
from pydantic import ValidationError

from app.core.config import Settings, get_settings
from app.core.logging import StructuredJsonFormatter
from app.core.security import rate_limiter
from app.main import create_app
from app.models.vision_model import preprocess_and_measure_image
from evaluation.real_world_vision.compare_vision_models import run_comparison


def test_rate_limit_returns_429_when_exceeded(monkeypatch):
    monkeypatch.setenv("AI_RATE_LIMIT_PER_MINUTE", "10")
    monkeypatch.setenv("AI_SERVICE_SECRET", "rate-limit-secret-123")
    monkeypatch.setenv("AI_EMBEDDING_BACKEND", "lightweight")
    monkeypatch.setenv("AI_VISION_BACKEND", "unavailable")
    get_settings.cache_clear()
    rate_limiter.reset()

    app = create_app()
    client = TestClient(app)
    headers = {"X-AI-Service-Secret": "rate-limit-secret-123"}

    statuses = []
    for _ in range(12):
        res = client.post("/api/v1/privacy/redact", headers=headers, json={"description": "asap tebal"})
        statuses.append(res.status_code)

    assert statuses[:10] == [200] * 10
    assert 429 in statuses[10:]

    get_settings.cache_clear()
    rate_limiter.reset()


def test_vision_rejects_oversized_image_with_413(monkeypatch):
    monkeypatch.setenv("AI_MAX_IMAGE_BYTES", "1024")
    monkeypatch.setenv("AI_SERVICE_SECRET", "size-limit-secret-123")
    get_settings.cache_clear()
    rate_limiter.reset()

    app = create_app()
    client = TestClient(app)
    headers = {"X-AI-Service-Secret": "size-limit-secret-123"}

    res = client.post(
        "/api/v1/vision/analyze",
        headers=headers,
        files={"file": ("big.png", b"x" * 2048, "image/png")},
    )
    assert res.status_code == 413
    assert res.json()["code"] == "IMAGE_TOO_LARGE"

    get_settings.cache_clear()


def test_image_preprocessing_strips_exif_metadata():
    img = Image.new("RGB", (200, 200), (120, 140, 100))
    exif = Image.Exif()
    exif[0x010F] = "SecretCameraVendor"
    exif[0x013B] = "SecretCitizenPhotographer"
    buf = BytesIO()
    img.save(buf, format="JPEG", exif=exif.tobytes())
    raw_with_exif = buf.getvalue()
    assert b"SecretCitizenPhotographer" in raw_with_exif

    clean_img, quality, width, height = preprocess_and_measure_image(raw_with_exif, max_bytes=1_000_000)
    assert (width, height) == (200, 200)
    assert quality is not None

    out_buf = BytesIO()
    clean_img.save(out_buf, format="JPEG")
    assert b"SecretCitizenPhotographer" not in out_buf.getvalue()
    assert len(clean_img.getexif()) == 0


def test_triage_negation_and_village_parit_not_inflated(client, auth_headers):
    res = client.post(
        "/api/v1/triage/analyze",
        headers=auth_headers,
        json={
            "report_id": "JGN-NEG-01",
            "title": "Asap tipis di semak Desa Parit Baru",
            "description": "Terlihat asap putih ringan di semak jauh dari rumah warga dan tanpa kobaran api.",
            "category": "semak-belukar",
            "location_description": "Desa Parit Baru Km 3",
            "latitude": -0.1,
            "longitude": 109.4,
            "has_evidence_image": False,
        },
    )
    assert res.status_code == 200
    body = res.json()
    assert body["text_analysis"]["flames_mentioned"] is False
    assert "near_settlement_mentioned" not in body["text_analysis"]["fire_indicators"]
    assert "lahan_gambut" not in body["text_analysis"]["vegetation_or_land_types"]
    assert body["severity_recommendation"] == "LOW"


def test_pii_does_not_misclassify_nik_acronym_as_person_name(client, auth_headers):
    res = client.post(
        "/api/v1/privacy/redact",
        headers=auth_headers,
        json={
            "report_id": "PII-NIK-ACR",
            "description": "Data pelapor NIK 6171026511920004 atas nama Dewi Lestari.",
        },
    )
    assert res.status_code == 200
    body = res.json()
    assert body["entity_counts"]["NIK"] == 1
    assert body["entity_counts"]["PERSON_NAME"] == 1
    assert "Data pelapor NIK [REDACTED_NIK] atas nama [REDACTED_NAME]." == body["sanitized_description"]


def test_concurrent_requests_and_memory_telemetry(client, auth_headers):
    def worker(idx: int) -> int:
        r1 = client.post(
            "/api/v1/privacy/redact",
            headers=auth_headers,
            json={"report_id": f"CONC-{idx}", "description": f"Pelapor: Budi Santoso {idx}, HP 08123456789{idx % 10}"},
        )
        r2 = client.post(
            "/api/v1/triage/analyze",
            headers=auth_headers,
            json={
                "report_id": f"CONC-{idx}",
                "title": "Asap di gambut",
                "description": "Asap tebal di lahan gambut.",
                "latitude": -0.1,
                "longitude": 109.4,
            },
        )
        return r1.status_code == 200 and r2.status_code == 200

    with ThreadPoolExecutor(max_workers=8) as pool:
        results = list(pool.map(worker, range(8)))

    assert all(results)

    health = client.get("/api/v1/health", headers=auth_headers)
    assert health.status_code == 200
    telemetry = health.json()["telemetry"]
    assert telemetry["total_inferences"] >= 16
    assert telemetry["error_rate"] == 0.0
    assert "memory_rss_mb" in telemetry
    assert isinstance(telemetry["memory_rss_mb"], float)
    assert telemetry["memory_rss_mb"] > 0


def test_real_world_vision_comparison_reports_unavailable_honestly():
    out = run_comparison(use_synthetic_sanity=False, adapters_to_run=["clip"])
    assert out["status"] == "REAL_DATASET_UNAVAILABLE"
    # Verify Settings accepts siglip option cleanly
    s = Settings(ai_vision_backend="siglip", ai_vision_model="google/siglip-base-patch16-224")
    assert s.ai_vision_backend == "siglip"


def test_production_rejects_weak_or_default_service_secret():
    with pytest.raises(ValidationError):
        Settings(ai_env="production", ai_service_secret="change-me-local-shared-secret")

    with pytest.raises(ValidationError):
        Settings(ai_env="production", ai_service_secret="short-secret")

    strong = Settings(
        ai_env="production",
        ai_service_secret="0123456789abcdef0123456789abcdef",
    )
    assert strong.ai_env == "production"


def test_production_disables_docs_and_openapi_and_sets_security_headers(monkeypatch):
    monkeypatch.setenv("AI_ENV", "production")
    monkeypatch.setenv("AI_SERVICE_SECRET", "0123456789abcdef0123456789abcdef")
    monkeypatch.setenv("AI_EMBEDDING_BACKEND", "lightweight")
    monkeypatch.setenv("AI_VISION_BACKEND", "unavailable")
    monkeypatch.setenv("AI_PRELOAD_MODELS", "false")
    get_settings.cache_clear()
    rate_limiter.reset()

    app = create_app()
    client = TestClient(app)

    assert client.get("/docs").status_code == 404
    assert client.get("/openapi.json").status_code == 404

    pub_health = client.get("/api/v1/health")
    assert pub_health.status_code == 200
    assert pub_health.json()["environment"] == "restricted"
    assert pub_health.headers.get("X-Content-Type-Options") == "nosniff"
    assert pub_health.headers.get("X-Frame-Options") == "DENY"
    assert pub_health.headers.get("Cache-Control") == "no-store"

    get_settings.cache_clear()


def test_oversized_json_request_returns_413_payload_too_large(monkeypatch):
    monkeypatch.setenv("AI_ENV", "test")
    monkeypatch.setenv("AI_MAX_REQUEST_BYTES", "4096")
    monkeypatch.setenv("AI_SERVICE_SECRET", "test-secret-123456")
    monkeypatch.setenv("AI_EMBEDDING_BACKEND", "lightweight")
    monkeypatch.setenv("AI_VISION_BACKEND", "unavailable")
    get_settings.cache_clear()
    rate_limiter.reset()

    app = create_app()
    client = TestClient(app)

    res = client.post(
        "/api/v1/privacy/redact",
        headers={"X-AI-Service-Secret": "test-secret-123456"},
        json={"description": "A" * 5000},
    )
    assert res.status_code == 413
    assert res.json()["code"] == "PAYLOAD_TOO_LARGE"
    assert res.headers.get("X-Content-Type-Options") == "nosniff"

    get_settings.cache_clear()


def test_structured_logger_redacts_nested_secrets_and_pii():
    formatter = StructuredJsonFormatter()
    record = logging.LogRecord(
        name="jagain_ai.test",
        level=logging.INFO,
        pathname=__file__,
        lineno=1,
        msg="Testing nested redaction",
        args=(),
        exc_info=None,
    )
    record.structured_extra = {
        "report_id": "JGN-001",
        "nested": {
            "api_key": "raw-api-key-value",
            "nik": "6171012304900001",
            "inner": [{"token": "secret-token-value"}],
        },
    }

    formatted = formatter.format(record)
    assert "raw-api-key-value" not in formatted
    assert "6171012304900001" not in formatted
    assert "secret-token-value" not in formatted

    parsed = json.loads(formatted)
    assert parsed["context"]["report_id"] == "JGN-001"
    assert parsed["context"]["nested"]["api_key"] == "[REDACTED]"
    assert parsed["context"]["nested"]["nik"] == "[REDACTED]"
    assert parsed["context"]["nested"]["inner"][0]["token"] == "[REDACTED]"
