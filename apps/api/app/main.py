from functools import lru_cache
from pathlib import Path

from fastapi import FastAPI, HTTPException

from app.data_loader import load_media_documents, validate_dataset
from app.models import GraphEdge, GraphResponse, Media, MediaNode

BASE_DIR = Path(__file__).resolve().parent.parent
REPO_DIR = BASE_DIR.parent.parent
DATA_DIR = REPO_DIR / "dataset" / "data" / "media"
SCHEMA_PATH = REPO_DIR / "dataset" / "schemas" / "media.schema.json"
SCRIPTS_DIR = REPO_DIR / "scripts"  # Scripts now at repo root

app = FastAPI(
    title="Marvel Media Graph API",
    version="1.0.0",
    description="Versioned Marvel media dataset backed by JSON files.",
)


@lru_cache
def get_media() -> list[Media]:
    documents = load_media_documents(DATA_DIR)
    errors = validate_dataset(documents, SCHEMA_PATH)
    if errors:
        detail = " | ".join(errors)
        raise RuntimeError(f"Dataset validation failed: {detail}")
    return [Media.model_validate(document) for document in documents]


def get_media_index() -> dict[str, Media]:
    media_entries = get_media()
    return {entry.id: entry for entry in media_entries}


@app.get("/")
def root() -> dict[str, str]:
    return {"message": "Marvel Media Graph API is running"}


@app.get("/api/v1/media", response_model=list[Media])
def list_media() -> list[Media]:
    try:
        return get_media()
    except RuntimeError as error:
        raise HTTPException(status_code=500, detail=str(error)) from error


@app.get("/api/v1/media/{media_id}", response_model=Media)
def get_media_item(media_id: str) -> Media:
    try:
        media_index = get_media_index()
    except RuntimeError as error:
        raise HTTPException(status_code=500, detail=str(error)) from error

    media_entry = media_index.get(media_id)
    if not media_entry:
        raise HTTPException(status_code=404, detail="Media not found")
    return media_entry


@app.get("/api/v1/graph", response_model=GraphResponse)
def get_graph() -> GraphResponse:
    try:
        media_entries = get_media()
    except RuntimeError as error:
        raise HTTPException(status_code=500, detail=str(error)) from error

    nodes = [
        MediaNode(
            id=entry.id,
            title=entry.title,
            release_date=entry.release_date,
            phase=entry.phase,
            mediatype=entry.mediatype,
            poster=entry.poster,
        )
        for entry in media_entries
    ]
    edges: list[GraphEdge] = []

    for media_entry in media_entries:
        edges.extend(
            GraphEdge(source=media_entry.id, target=link.media_id, type="required")
            for link in media_entry.connections.required
        )
        edges.extend(
            GraphEdge(source=media_entry.id, target=link.media_id, type="optionnal")
            for link in media_entry.connections.optionnal
        )
        edges.extend(
            GraphEdge(source=media_entry.id, target=link.media_id, type="references")
            for link in media_entry.connections.references
        )

    return GraphResponse(nodes=nodes, edges=edges)
