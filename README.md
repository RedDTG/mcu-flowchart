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
- `release_date`: ISO format date (`YYYY-MM-DD`)
- `saga`: one of `Infinite Saga`, `Multiverse Saga`
- `mediatype`: one of `movie`, `show`, `special`
- `poster`: local path (example: `/posters/iron-man.jpg`)
- `summary`: non-empty string
- `connections`: object with arrays `required`, `optional`, `references`

## Quick Start (API)

```powershell
Set-Location apps/api
python -m pip install -r requirements.txt
python ..\..\scripts\validate_data.py
python run.py
```

API docs are available at `http://127.0.0.1:8000/docs`.

## Docker Compose (API)

Run API locally with Docker Compose:

```powershell
Set-Location c:\Users\antoine.deyris\Documents\mcu-flowchart
docker compose up --build -d
```

API will be available at `http://localhost:8000`.

Stop services:

```powershell
docker compose down
```

## CI/CD Deploy with GitHub Actions + Docker Compose

This repository includes `.github/workflows/deploy-api.yml` to:

1. Build/push API image to GHCR (`ghcr.io/<owner>/mcu-flowchart-api:latest`)
2. Copy `docker-compose.server.yml` to your server
3. Pull/restart with Docker Compose over SSH

Required GitHub repository secrets:

- `SERVER_HOST`
- `SERVER_USER`
- `SERVER_SSH_KEY`
- `SERVER_PORT` (optional)
- `GHCR_TOKEN` (PAT with at least `read:packages`)

Server prerequisites:

- Docker + Docker Compose installed
- writable path `/opt/mcu-flowchart-api`

## Quick Start (Frontend)

```powershell
Set-Location apps/web
.\..\..\.tools\nodejs\node-v24.14.1-win-x64\npm.cmd install
.\..\..\.tools\nodejs\node-v24.14.1-win-x64\npm.cmd run dev
```

Frontend is available at `http://localhost:3000`.

**Note:** Frontend requires backend API running on `http://localhost:8000`.

## Running Both Services

Open two terminals:

**Terminal 1 (API):**
```powershell
Set-Location apps/api
python run.py
```

**Terminal 2 (Frontend):**
```powershell
Set-Location apps/web
.\..\..\.tools\nodejs\node-v24.14.1-win-x64\npm.cmd run dev
```

Then navigate to `http://localhost:3000` to view the application.

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

