def test_deduplication_scores_nearby_similar_higher_than_distant_report(client, auth_headers):
    payload = {
        "source_report": {
            "report_id": "1",
            "title": "Asap pekat di lahan gambut Rasau Jaya Km 14",
            "description": "Kepulan asap tebal terlihat di parit lahan gambut Rasau Jaya Tiga.",
            "category": "lahan-gambut",
            "latitude": -0.1558,
            "longitude": 109.3872,
            "created_at": "2026-10-20T10:00:00+07:00",
        },
        "candidates": [
            {
                "report_id": "2",
                "title": "Kebakaran lahan gambut Rasau Jaya Km 14",
                "description": "Kepulan asap tebal terlihat dari parit lahan gambut Rasau Jaya Tiga.",
                "category": "lahan-gambut",
                "latitude": -0.1570,
                "longitude": 109.3885,
                "created_at": "2026-10-20T10:20:00+07:00",
            },
            {
                "report_id": "3",
                "title": "Asap pekat di lahan gambut Palangka Raya",
                "description": "Kepulan asap tebal terlihat di parit lahan gambut Palangka Raya.",
                "category": "lahan-gambut",
                "latitude": -2.2350,
                "longitude": 113.8900,
                "created_at": "2026-10-20T10:10:00+07:00",
            },
        ],
    }

    res = client.post("/api/v1/deduplication/analyze", headers=auth_headers, json=payload)
    assert res.status_code == 200
    body = res.json()
    assert len(body["source_embedding"]) == 384
    cands = {c["report_id"]: c for c in body["potential_duplicates"]}
    assert cands["2"]["recommendation"] in {"LIKELY_DUPLICATE", "POSSIBLE_DUPLICATE"}
    assert cands["2"]["distance_meters"] < 500
    assert cands["3"]["recommendation"] == "UNRELATED"
    assert cands["3"]["distance_meters"] > 400000


def test_embedding_endpoint_returns_consistent_hash_and_dimensions(client, auth_headers):
    res = client.post(
        "/api/v1/deduplication/embed",
        headers=auth_headers,
        json={"report_id": "R-10", "text": "Kebakaran gambut di Kubu Raya."},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["dimensions"] == 384
    assert len(body["vector"]) == 384
    assert len(body["content_hash"]) == 64
