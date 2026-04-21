from fastapi.testclient import TestClient

import app.main as app_main

from app.main import app
from app.models import Media

client = TestClient(app)


def test_list_media_returns_data() -> None:
    response = client.get("/api/v1/media")
    assert response.status_code == 200

    payload = response.json()
    assert isinstance(payload, list)
    assert len(payload) >= 1
    assert {"id", "title", "connections"}.issubset(payload[0].keys())


def test_get_single_media_item() -> None:
    response = client.get("/api/v1/media/iron-man")
    assert response.status_code == 200

    payload = response.json()
    assert payload["id"] == "iron-man"


def test_graph_endpoint() -> None:
    response = client.get("/api/v1/graph")
    assert response.status_code == 200

    payload = response.json()
    assert "nodes" in payload
    assert "edges" in payload
    assert len(payload["nodes"]) >= 1


def test_list_sagas_poster_path_is_normalized() -> None:
    response = client.get("/api/v1/sagas")
    assert response.status_code == 200

    payload = response.json()
    assert isinstance(payload, list)
    assert len(payload) >= 1
    assert payload[0]["poster"].startswith("/api/v1/posters/")


def test_graph_saga_link_targets_latest_media(monkeypatch) -> None:
    sample_media = [
        Media.model_validate(
            {
                "id": "source",
                "title": "Source",
                "release_date": "2020-01-01",
                "saga": "other-saga",
                "universe": "mcu",
                "mediatype": "movie",
                "poster": "/api/v1/posters/source.jpg",
                "summary": "Source summary",
                "connections": {
                    "required": [{"saga_id": "target-saga"}],
                    "optional": [],
                    "references": [],
                },
            }
        ),
        Media.model_validate(
            {
                "id": "target-old",
                "title": "Target Old",
                "release_date": "2018-01-01",
                "saga": "target-saga",
                "universe": "mcu",
                "mediatype": "movie",
                "poster": "/api/v1/posters/target-old.jpg",
                "summary": "Target old summary",
                "connections": {
                    "required": [],
                    "optional": [],
                    "references": [],
                },
            }
        ),
        Media.model_validate(
            {
                "id": "target-latest",
                "title": "Target Latest",
                "release_date": "2024-01-01",
                "saga": "target-saga",
                "universe": "mcu",
                "mediatype": "movie",
                "poster": "/api/v1/posters/target-latest.jpg",
                "summary": "Target latest summary",
                "connections": {
                    "required": [],
                    "optional": [],
                    "references": [],
                },
            }
        ),
    ]

    monkeypatch.setattr(app_main, "get_media", lambda: sample_media)

    response = client.get("/api/v1/graph")
    assert response.status_code == 200

    payload = response.json()
    edges = payload["edges"]

    assert {
        "source": "source",
        "target": "target-latest",
        "type": "required",
    } in edges
    assert {
        "source": "source",
        "target": "target-old",
        "type": "required",
    } not in edges
