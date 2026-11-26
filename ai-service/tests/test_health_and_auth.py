def test_public_health_returns_minimal_status(client):
    res = client.get("/api/v1/health")
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "ok"
    assert body["models"] is None
    assert body["telemetry"] is None


def test_authenticated_health_returns_models_and_telemetry(client, auth_headers):
    res = client.get("/api/v1/health", headers=auth_headers)
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "ok"
    assert "vision" in body["models"]
    assert "embedding" in body["models"]
    assert "ner" in body["models"]
    assert "total_inferences" in body["telemetry"]


def test_protected_endpoints_reject_missing_or_wrong_secret(client):
    res_missing = client.post("/api/v1/privacy/redact", json={"description": "halo"})
    assert res_missing.status_code == 401
    assert res_missing.json()["code"] == "UNAUTHORIZED_AI_CALLER"

    res_wrong = client.post(
        "/api/v1/privacy/redact",
        headers={"X-AI-Service-Secret": "wrong-secret"},
        json={"description": "halo"},
    )
    assert res_wrong.status_code == 401


def test_validation_error_returns_sanitized_schema(client, auth_headers):
    res = client.post(
        "/api/v1/triage/analyze",
        headers=auth_headers,
        json={"report_id": "R1", "title": "x", "description": "y", "latitude": 120.0, "longitude": 109.0},
    )
    assert res.status_code == 422
    body = res.json()
    assert body["code"] == "VALIDATION_ERROR"
    assert "request_id" in body
