import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent  # scripts is at repo root, go up to repo root
API_DIR = BASE_DIR / "apps" / "api"
if str(API_DIR) not in sys.path:
    sys.path.insert(0, str(API_DIR))

from app.data_loader import load_media_documents, validate_dataset

DATA_DIR = BASE_DIR / "dataset" / "data" / "media"
SCHEMA_PATH = BASE_DIR / "dataset" / "schemas" / "media.schema.json"


def main() -> int:
    documents = load_media_documents(DATA_DIR)
    errors = validate_dataset(documents, SCHEMA_PATH)

    if errors:
        print("Dataset validation failed:")
        for error in errors:
            print(f"- {error}")
        return 1

    print(f"Dataset valid: {len(documents)} media files checked.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
