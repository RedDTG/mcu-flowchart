# MCU Flowchart Monorepo

This repository contains a FastAPI backend and a shared MCU media dataset designed for a future frontend.

## Repository Structure

```text
apps/
  api/        # FastAPI backend
  web/        # Frontend placeholder and setup notes
dataset/
  data/
    media/    # One JSON file per media title
  posters/    # Local poster assets (referenced by dataset)
  schemas/    # Shared JSON Schema
scripts/      # Validation and API smoke scripts
```

## Current Data Spec

Each media file in `dataset/data/media/*.json` includes:

- `id`: unique string identifier
- `title`: media title
- `release date`: ISO format date (`YYYY-MM-DD`)
- `phase`: positive integer
- `mediatype`: one of `movie`, `show`, `special`
- `poster`: local path (example: `/posters/iron-man.jpg`)
- `summary`: non-empty string
- `connections`: object with arrays `required`, `optionnal`, `references`

## Quick Start (API)

```powershell
Set-Location apps/api
python -m pip install -r requirements.txt
python ..\..\scripts\validate_data.py
python run.py
```

API docs are available at `http://127.0.0.1:8000/docs`.

## Validation and Tests

From repository root:

```powershell
python scripts\validate_data.py
```

From `apps/api`:

```powershell
python -m pytest -q
```

For more details:

- Backend docs: `apps/api/README.md`
- Frontend placeholder docs: `apps/web/README.md`
- Dataset docs: `dataset/README.md`
