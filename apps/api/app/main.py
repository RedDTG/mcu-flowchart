from functools import lru_cache
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.data_loader import load_json_file, load_media_documents, validate_dataset
from app.models import GraphEdge, GraphResponse, Media, MediaNode, Saga, Universe

BASE_DIR = Path(__file__).resolve().parent.parent
REPO_DIR = BASE_DIR.parent.parent
DATA_DIR = REPO_DIR / "dataset" / "data" / "media"
SAGAS_DIR = REPO_DIR / "dataset" / "data" / "sagas"
UNIVERSES_DIR = REPO_DIR / "dataset" / "data" / "universes"
SCHEMA_PATH = REPO_DIR / "dataset" / "schemas" / "media.schema.json"
POSTERS_DIR = REPO_DIR / "dataset" / "data" / "posters"
LEGACY_POSTERS_DIR = REPO_DIR / "dataset" / "posters"
SCRIPTS_DIR = REPO_DIR / "scripts"  # Scripts now at repo root

app = FastAPI(
    title="Marvel Media Graph API",
    version="1.0.0",
    description="Versioned Marvel media dataset backed by JSON files.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if not POSTERS_DIR.exists() and LEGACY_POSTERS_DIR.exists():
    POSTERS_DIR = LEGACY_POSTERS_DIR

POSTERS_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/api/v1/posters", StaticFiles(directory=POSTERS_DIR), name="api_posters")
app.mount("/posters", StaticFiles(directory=POSTERS_DIR), name="posters")


def normalize_poster_path(poster: str) -> str:
    if poster.startswith(("http://", "https://", "/api/v1/posters/")):
        return poster
    if poster.startswith("/posters/"):
        return poster.replace("/posters/", "/api/v1/posters/", 1)
    if poster.startswith("posters/"):
        return f"/api/v1/{poster}"
    return poster


@lru_cache
def get_media() -> list[Media]:
    documents = load_media_documents(DATA_DIR)
    errors = validate_dataset(documents, SCHEMA_PATH, SAGAS_DIR)
    if errors:
        detail = " | ".join(errors)
        raise RuntimeError(f"Dataset validation failed: {detail}")

    for document in documents:
        poster = document.get("poster")
        if isinstance(poster, str):
            document["poster"] = normalize_poster_path(poster)
    return [Media.model_validate(document) for document in documents]


def get_media_index() -> dict[str, Media]:
    media_entries = get_media()
    return {entry.id: entry for entry in media_entries}


@lru_cache
def get_universes() -> list[Universe]:
    universe_files = sorted(UNIVERSES_DIR.glob("*.json"))
    universes = [load_json_file(universe_file) for universe_file in universe_files]
    return [Universe.model_validate(universe) for universe in universes]


@lru_cache
def get_sagas() -> list[Saga]:
    saga_files = sorted(SAGAS_DIR.glob("*.json"))
    sagas = [load_json_file(saga_file) for saga_file in saga_files]

    for saga in sagas:
        poster = saga.get("poster")
        if isinstance(poster, str):
            saga["poster"] = normalize_poster_path(poster)

    return [Saga.model_validate(saga) for saga in sagas]


@app.get("/")
def root() -> dict[str, str]:
    return {"message": "Marvel Media Graph API is running"}


@app.get("/api/v1/media", response_model=list[Media])
def list_media() -> list[Media]:
    try:
        return get_media()
    except RuntimeError as error:
        raise HTTPException(status_code=500, detail=str(error)) from error


@app.get("/api/v1/universes", response_model=list[Universe])
def list_universes() -> list[Universe]:
    try:
        return get_universes()
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error)) from error


@app.get("/api/v1/sagas", response_model=list[Saga])
def list_sagas() -> list[Saga]:
    try:
        return get_sagas()
    except Exception as error:
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
            saga=entry.saga,
            universe=entry.universe,
            mediatype=entry.mediatype,
            poster=entry.poster,
        )
        for entry in media_entries
    ]
    edges: list[GraphEdge] = []
    latest_media_id_by_saga: dict[str, str] = {}
    latest_media_by_saga: dict[str, Media] = {}

    for entry in media_entries:
        if entry.saga:
            current_latest = latest_media_by_saga.get(entry.saga)
            if not current_latest or (entry.release_date, entry.id) > (
                current_latest.release_date,
                current_latest.id,
            ):
                latest_media_by_saga[entry.saga] = entry

    latest_media_id_by_saga = {
        saga_id: media_entry.id
        for saga_id, media_entry in latest_media_by_saga.items()
    }

    def edge_targets(source_id: str, links: list) -> list[str]:
        targets: list[str] = []

        for link in links:
            if link.media_id:
                targets.append(link.media_id)
                continue

            if link.saga_id:
                target_id = latest_media_id_by_saga.get(link.saga_id)
                if target_id and target_id != source_id:
                    targets.append(target_id)

        return list(dict.fromkeys(targets))

    for media_entry in media_entries:
        edges.extend(
            GraphEdge(source=media_entry.id, target=target_id, type="required")
            for target_id in edge_targets(media_entry.id, media_entry.connections.required)
        )
        edges.extend(
            GraphEdge(source=media_entry.id, target=target_id, type="optional")
            for target_id in edge_targets(media_entry.id, media_entry.connections.optional)
        )
        edges.extend(
            GraphEdge(source=media_entry.id, target=target_id, type="references")
            for target_id in edge_targets(media_entry.id, media_entry.connections.references)
        )

    return GraphResponse(nodes=nodes, edges=edges)

