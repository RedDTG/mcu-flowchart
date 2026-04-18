# API - Marvel Media Graph (FastAPI)

Python API backed by versioned JSON files (one title per file), with schema validation and reference integrity checks.

## Local Structure

```text
app/
  main.py
  models.py
  data_loader.py
tests/
  test_api.py
  test_validation.py
run.py
requirements.txt
```

Shared resources from monorepo root:

- `../../dataset/data/media/*.json`
- `../../dataset/schemas/media.schema.json`
- `../../dataset/posters/`
- `../../scripts/validate_data.py`
- `../../scripts/smoke_api.py`

## Data Contract (Media)

Each file in `../../dataset/data/media/*.json` follows this structure:

```json
{
  "id": "string",
  "title": "string",
  "release_date": "2008-05-02",
  "saga": "infinite-saga",
  "mediatype": "movie",
  "poster": "/posters/iron-man.jpg",
  "summary": "string",
  "connections": {
    "required": [{ "media_id": "string" }],
    "optional": [{ "media_id": "string" }],
    "references": [{ "media_id": "string" }]
  }
}
```

Rules:

- `release_date` must use ISO format (`YYYY-MM-DD`)
- `mediatype` must be one of: `movie`, `show`, `special`
- `poster` is stored as a local path (for example `/posters/<media-id>.jpg`)
- Connection object supports optional `reason` and `importance` fields

## Endpoints

- `GET /` : API health message
- `GET /api/v1/media` : list all media entries
- `GET /api/v1/media/{media_id}` : get one media entry by id
- `GET /api/v1/graph` : graph payload (`nodes` + `edges`)

## Install and Run

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python ..\..\scripts\validate_data.py
python run.py
```

Swagger/OpenAPI UI: `http://127.0.0.1:8000/docs`

## Tests

```powershell
python -m pytest -q
```

## Smoke Test (Optional)

Run from repository root:

```powershell
python scripts\smoke_api.py
```

