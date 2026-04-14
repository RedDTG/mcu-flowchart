from pathlib import Path

from app.data_loader import load_media_documents, load_schema, validate_dataset, validate_schema


def test_dataset_is_valid() -> None:
    base_dir = Path(__file__).resolve().parent.parent
    repo_dir = base_dir.parent.parent
    data_dir = repo_dir / "dataset" / "data" / "media"
    schema_path = repo_dir / "dataset" / "schemas" / "media.schema.json"

    documents = load_media_documents(data_dir)
    errors = validate_dataset(documents, schema_path)

    assert errors == []


def test_optionnal_connection_is_required() -> None:
    base_dir = Path(__file__).resolve().parent.parent
    repo_dir = base_dir.parent.parent
    schema_path = repo_dir / "dataset" / "schemas" / "media.schema.json"
    schema = load_schema(schema_path)

    document_without_optionnal = {
        "id": "sample-media",
        "title": "Sample Media",
        "release date": "2026-01-15",
        "phase": 7,
        "mediatype": "movie",
        "poster": "https://example.com/poster.jpg",
        "summary": "Sample summary",
        "connections": {
            "required": [],
            "references": [],
        },
    }

    errors = validate_schema([document_without_optionnal], schema)

    assert len(errors) > 0
    assert "required property" in errors[0]
    assert "optionnal" in errors[0]
