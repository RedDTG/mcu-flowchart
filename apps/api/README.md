# API - Marvel Media Graph

FastAPI service backed by versioned JSON files from the shared dataset. It validates media metadata, serves poster assets, and exposes list, detail, universe, saga, and graph endpoints for the web app.

## Structure

```text
app/
  main.py          # FastAPI routes and static poster mounts
  models.py        # Pydantic response models
  data_loader.py   # Dataset loading and validation helpers
tests/             # API and validation tests
run.py             # Local development entrypoint
requirements.txt
```

Shared resources are read from the repository root:

- `dataset/data/media/*.json`
- `dataset/data/posters/`
- `dataset/data/sagas/*.json`
- `dataset/data/universes/*.json`
- `dataset/schemas/media.schema.json`

## Install And Run

```bash
python -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python ../../scripts/validate_data.py
python run.py
```

On Windows PowerShell, activate the virtual environment with:

```powershell
.\.venv\Scripts\Activate.ps1
```

The OpenAPI UI is available at `http://127.0.0.1:8001/docs`.

## Endpoints

- `GET /`: health message
- `GET /api/v1/media`: list all media entries
- `GET /api/v1/media/{media_id}`: get one media entry by id
- `GET /api/v1/universes`: list universe metadata
- `GET /api/v1/sagas`: list saga metadata
- `GET /api/v1/graph`: graph payload with `nodes` and `edges`
- `GET /api/v1/posters/{file}`: poster assets

## Tests

```bash
python -m pytest -q
```

## Smoke Test

Run from the repository root:

```bash
python scripts/smoke_api.py
```
