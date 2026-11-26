import base64
from io import BytesIO

from PIL import Image


def _make_png_b64(color: tuple[int, int, int] = (200, 120, 40), size: tuple[int, int] = (200, 200)) -> str:
    img = Image.new("RGB", size, color)
    buf = BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("ascii")


def test_triage_extracts_peatland_and_urgency_indicators(client, auth_headers):
    res = client.post(
        "/api/v1/triage/analyze",
        headers=auth_headers,
        json={
            "report_id": "JGN-202611-00001",
            "title": "Api membesar di lahan gambut dekat permukiman",
            "description": (
                "Nyala api membakar lahan gambut seluas 3 hektar dengan angin kencang mendekati rumah warga."
            ),
            "category": "lahan-gambut",
            "location_description": "Desa Rasau Jaya Tiga Km 14",
            "latitude": -0.1558,
            "longitude": 109.3872,
            "has_evidence_image": False,
        },
    )
    assert res.status_code == 200
    body = res.json()
    assert body["incident_category"] == "PEATLAND_FIRE"
    assert body["severity_recommendation"] == "CRITICAL"
    assert body["requires_human_review"] is True
    assert body["confidence_type"] == "RULE_BASED"
    assert "flames_mentioned" in body["text_analysis"]["fire_indicators"]
    assert "near_settlement_mentioned" in body["text_analysis"]["fire_indicators"]
    assert len(body["severity_rationale"]) >= 2


def test_triage_flags_invalid_image_payload_safely(client, auth_headers):
    res = client.post(
        "/api/v1/triage/analyze",
        headers=auth_headers,
        json={
            "report_id": "JGN-202611-00002",
            "title": "Asap tebal di perkebunan sawit",
            "description": "Terlihat kepulan asap putih di area perkebunan sawit.",
            "latitude": -0.1,
            "longitude": 109.4,
            "has_evidence_image": True,
            "image_base64": "not-valid-base64!!!",
        },
    )
    assert res.status_code == 200
    body = res.json()
    assert body["image_analysis"]["analyzed"] is False
    assert body["image_analysis"]["adapter_status"] == "INVALID_IMAGE_PAYLOAD"
    assert body["requires_human_review"] is True


def test_vision_endpoint_rejects_corrupt_bytes_and_handles_unavailable_adapter(client, auth_headers):
    bad = client.post(
        "/api/v1/vision/analyze",
        headers=auth_headers,
        files={"file": ("bad.jpg", b"not-an-image", "image/jpeg")},
    )
    assert bad.status_code == 422
    assert bad.json()["code"] == "INVALID_IMAGE"

    valid_b64 = _make_png_b64()
    raw = base64.b64decode(valid_b64)
    ok = client.post(
        "/api/v1/vision/analyze",
        headers=auth_headers,
        files={"file": ("smoke.png", raw, "image/png")},
    )
    assert ok.status_code == 200
    body = ok.json()
    assert body["result"]["analyzed"] is False
    assert body["result"]["adapter_status"] == "UNAVAILABLE"
    assert body["result"]["width_px"] == 200
