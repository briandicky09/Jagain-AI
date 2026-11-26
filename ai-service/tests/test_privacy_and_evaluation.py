def test_pii_redaction_covers_indonesian_entities(client, auth_headers):
    res = client.post(
        "/api/v1/privacy/redact",
        headers=auth_headers,
        json={
            "report_id": "R-PII-1",
            "title": "Asap di Rasau Jaya",
            "description": (
                "Nama saya Andi Pratama, NIK 6171012304900001, nomor HP 081234567890, "
                "email andi.pratama@example.com, alamat Jl. Merdeka No. 14 RT 02/RW 05. "
                "Saya melihat asap tebal di sekitar lokasi tersebut."
            ),
        },
    )
    assert res.status_code == 200
    body = res.json()
    assert body["pii_detected"] is True
    assert body["redaction_applied"] is True
    sanitized = body["sanitized_description"]
    assert "Andi Pratama" not in sanitized
    assert "6171012304900001" not in sanitized
    assert "081234567890" not in sanitized
    assert "andi.pratama@example.com" not in sanitized
    assert "Jl. Merdeka No. 14" not in sanitized
    assert "[REDACTED_NAME]" in sanitized
    assert "[REDACTED_NIK]" in sanitized
    assert "[REDACTED_PHONE]" in sanitized
    assert "[REDACTED_EMAIL]" in sanitized
    assert "[REDACTED_ADDRESS]" in sanitized


def test_pii_redaction_avoids_false_positives_on_kalimantan_landmarks(client, auth_headers):
    text = (
        "BPBD Kalimantan Barat dan Manggala Agni memantau asap pekat di "
        "Jl. Trans Kalimantan Km 18 Desa Rasau Jaya Tiga sekitar 1250 meter."
    )
    res = client.post(
        "/api/v1/privacy/redact",
        headers=auth_headers,
        json={"title": "Asap di Kubu Raya", "description": text},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["pii_detected"] is False
    assert body["sanitized_description"] == text


def test_evaluation_endpoint_computes_metrics_with_offline_adapters(client, auth_headers):
    res = client.post(
        "/api/v1/evaluation/run",
        headers=auth_headers,
        json={"modules": ["triage", "privacy"], "split": "test"},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["is_simulated_dataset"] is True
    assert body["modules"]["triage"]["measured"] is True
    assert body["modules"]["privacy"]["measured"] is True
