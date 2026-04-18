from pathlib import Path

from app.data_loader import load_media_documents, load_schema, validate_dataset, validate_references, validate_schema


def test_dataset_is_valid() -> None:
    base_dir = Path(__file__).resolve().parent.parent
    repo_dir = base_dir.parent.parent
    data_dir = repo_dir / "dataset" / "data" / "media"
    schema_path = repo_dir / "dataset" / "schemas" / "media.schema.json"

    documents = load_media_documents(data_dir)
    errors = validate_dataset(documents, schema_path)

    assert errors == []


def test_optional_connection_is_required() -> None:
    base_dir = Path(__file__).resolve().parent.parent
    repo_dir = base_dir.parent.parent
    schema_path = repo_dir / "dataset" / "schemas" / "media.schema.json"
    schema = load_schema(schema_path)

    document_without_optional = {
        "id": "sample-media",
        "title": "Sample Media",
        "release_date": "2026-01-15",
        "saga": "multiverse-saga",
        "universe": "mcu",
        "mediatype": "movie",
        "poster": "https://example.com/poster.jpg",
        "summary": "Sample summary",
        "connections": {
            "required": [],
            "references": [],
        },
    }

    errors = validate_schema([document_without_optional], schema)

    assert len(errors) > 0
    assert "required property" in errors[0]
    assert "optional" in errors[0]


def test_connection_can_target_saga_id() -> None:
    base_dir = Path(__file__).resolve().parent.parent
    repo_dir = base_dir.parent.parent
    schema_path = repo_dir / "dataset" / "schemas" / "media.schema.json"
    schema = load_schema(schema_path)

    document_with_saga_link = {
        "id": "sample-media",
        "title": "Sample Media",
        "release_date": "2026-01-15",
        "saga": "multiverse-saga",
        "universe": "mcu",
        "mediatype": "movie",
        "poster": "https://example.com/poster.jpg",
        "summary": "Sample summary",
        "connections": {
            "required": [{"saga_id": "multiverse-saga"}],
            "optional": [],
            "references": [],
        },
    }

    errors = validate_schema([document_with_saga_link], schema)

    assert errors == []


def test_validate_references_rejects_unknown_saga_id() -> None:
    base_dir = Path(__file__).resolve().parent.parent
    repo_dir = base_dir.parent.parent
    sagas_dir = repo_dir / "dataset" / "data" / "sagas"

    documents = [
        {
            "id": "sample-media",
            "title": "Sample Media",
            "release_date": "2026-01-15",
            "saga": "multiverse-saga",
            "universe": "mcu",
            "mediatype": "movie",
            "poster": "https://example.com/poster.jpg",
            "summary": "Sample summary",
            "connections": {
                "required": [{"saga_id": "unknown-saga"}],
                "optional": [],
                "references": [],
            },
        }
    ]

    errors = validate_references(documents, sagas_dir)

    assert len(errors) == 1
    assert "unknown saga_id 'unknown-saga'" in errors[0]

