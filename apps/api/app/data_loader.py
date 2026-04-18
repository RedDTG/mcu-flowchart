import json
from pathlib import Path

from jsonschema import Draft202012Validator


def load_json_file(file_path: Path) -> dict:
    with file_path.open("r", encoding="utf-8-sig") as file:
        return json.load(file)


def load_media_documents(data_dir: Path) -> list[dict]:
    media_files = sorted(data_dir.rglob("*.json"))
    return [load_json_file(media_file) for media_file in media_files]


def load_schema(schema_path: Path) -> dict:
    return load_json_file(schema_path)


def validate_schema(documents: list[dict], schema: dict) -> list[str]:
    validator = Draft202012Validator(schema)
    errors: list[str] = []

    for document in documents:
        media_id = document.get("id", "<missing-id>")
        for error in validator.iter_errors(document):
            location = ".".join(str(part) for part in error.path) or "root"
            errors.append(f"{media_id}: schema error at '{location}' - {error.message}")

    return errors


def load_saga_ids(sagas_dir: Path | None) -> set[str]:
    if not sagas_dir or not sagas_dir.exists():
        return set()

    saga_ids: set[str] = set()
    for saga_file in sorted(sagas_dir.glob("*.json")):
        saga = load_json_file(saga_file)
        saga_id = saga.get("id")
        if isinstance(saga_id, str) and saga_id:
            saga_ids.add(saga_id)
    return saga_ids


def validate_references(documents: list[dict], sagas_dir: Path | None = None) -> list[str]:
    errors: list[str] = []
    media_ids = {document.get("id") for document in documents if document.get("id")}
    saga_ids = load_saga_ids(sagas_dir)

    for document in documents:
        source_id = document.get("id", "<missing-id>")
        connections = document.get("connections", {})

        for relation_type in ("required", "optional", "references"):
            links = connections.get(relation_type, [])
            for link in links:
                if isinstance(link, dict):
                    media_target_id = link.get("media_id")
                    saga_target_id = link.get("saga_id")
                elif isinstance(link, str):
                    media_target_id = link
                    saga_target_id = None
                else:
                    errors.append(
                        f"{source_id}: invalid link format in connections.{relation_type}"
                    )
                    continue

                has_media_target = isinstance(media_target_id, str) and bool(media_target_id)
                has_saga_target = isinstance(saga_target_id, str) and bool(saga_target_id)

                if has_media_target == has_saga_target:
                    errors.append(
                        f"{source_id}: link in connections.{relation_type} must define exactly one of media_id or saga_id"
                    )
                    continue

                if has_media_target and media_target_id not in media_ids:
                    errors.append(
                        f"{source_id}: unknown media_id '{media_target_id}' in connections.{relation_type}"
                    )

                if has_saga_target and saga_ids and saga_target_id not in saga_ids:
                    errors.append(
                        f"{source_id}: unknown saga_id '{saga_target_id}' in connections.{relation_type}"
                    )

    return errors


def validate_dataset(
    documents: list[dict],
    schema_path: Path,
    sagas_dir: Path | None = None,
) -> list[str]:
    schema = load_schema(schema_path)
    schema_errors = validate_schema(documents, schema)
    reference_errors = validate_references(documents, sagas_dir)
    return schema_errors + reference_errors

