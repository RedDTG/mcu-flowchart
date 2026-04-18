from fastapi.testclient import TestClient

from app.main import app

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
