import json
from pathlib import Path

from jsonschema import Draft202012Validator


def load_json_file(file_path: Path) -> dict:
    with file_path.open("r", encoding="utf-8-sig") as file:
        return json.load(file)


def load_media_documents(data_dir: Path) -> list[dict]:
    media_files = sorted(data_dir.glob("*.json"))
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


def validate_references(documents: list[dict]) -> list[str]:
    errors: list[str] = []
    media_ids = {document.get("id") for document in documents if document.get("id")}

    for document in documents:
        source_id = document.get("id", "<missing-id>")
        connections = document.get("connections", {})

        for relation_type in ("required", "optionnal", "references"):
            links = connections.get(relation_type, [])
            for link in links:
                target_id = link.get("media_id")
                if target_id not in media_ids:
                    errors.append(
                        f"{source_id}: unknown media_id '{target_id}' in connections.{relation_type}"
                    )

    return errors


def validate_dataset(documents: list[dict], schema_path: Path) -> list[str]:
    schema = load_schema(schema_path)
    schema_errors = validate_schema(documents, schema)
    reference_errors = validate_references(documents)
    return schema_errors + reference_errors
