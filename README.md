# MCU Flowchart

MCU Flowchart is a public-friendly monorepo for exploring Marvel screen media as structured metadata. It combines a FastAPI backend, a Next.js frontend, and a JSON dataset that powers media pages, watching-order guidance, and relationship graphs.

## Contributing Metadata

The project is built around community-maintained metadata. If a title is missing, a relation looks wrong, or you disagree with how much context is required before watching something, contributions are welcome.

You can contribute by opening an issue or pull request for:

- new media entries in `dataset/data/media/`;
- poster references in `dataset/data/posters/`;
- universe and saga metadata in `dataset/data/universes/` and `dataset/data/sagas/`;
- connection updates in a media file's `connections.required`, `connections.optional`, or `connections.references` arrays;
- corrections to summaries, release dates, phases, sagas, or universe assignments.

Before opening a PR, run the dataset validator:

```bash
python scripts/validate_data.py
```

When changing relations, prefer a short `reason` explaining why the connection exists. Use `required` only when the linked media is important to understanding the story; use `optional` for helpful context; use `references` for callbacks, cameos, easter eggs, or lighter continuity links.

## Project Overview

- `apps/api`: FastAPI service that validates and serves the dataset.
- `apps/web`: Next.js application for browsing media and graph views.
- `dataset`: JSON metadata, schemas, posters, universes, and sagas.
- `scripts`: validation and smoke-test utilities.
- `.github/workflows`: deployment and release automation.

```text
apps/
  api/                  # FastAPI backend
  web/                  # Next.js frontend
dataset/
  data/
    media/              # One JSON file per title
    posters/            # Poster assets referenced by metadata
    sagas/              # Saga metadata
    universes/          # Universe metadata
  schemas/              # JSON schemas
scripts/                # Validation and smoke scripts
docker-compose.yml      # Local full-stack runtime
```

## Requirements

- Python 3.11+
- Node.js 24+
- Docker and Docker Compose, optional but recommended for local full-stack runs

## Quick Start With Docker

From the repository root:

```bash
docker compose up --build
```

Services are exposed at:

- Web app: `http://localhost:3001`
- API: `http://localhost:8001`
- API docs: `http://localhost:8001/docs`

Stop the stack with:

```bash
docker compose down
```

## Local Development

### API

```bash
cd apps/api
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

### Web

```bash
cd apps/web
npm install
cp .env.example .env.local
npm run dev
```

The frontend runs on `http://localhost:3001` and proxies `/api/*` requests to the API.

## Dataset Contract

Each file in `dataset/data/media/*.json` describes one title. Required fields include:

- `id`: stable unique identifier;
- `title`: display title;
- `release_date`: ISO date, `YYYY-MM-DD`;
- `universe`: one of the universe ids defined by the schema;
- `mediatype`: `movie`, `show`, or `special`;
- `poster`: poster URL path, usually `/posters/<id>.jpg`;
- `summary`: non-empty description;
- `connections`: relation groups for `required`, `optional`, and `references`.

Connection objects can target either a `media_id` or a `saga_id`, and may include:

- `reason`: human-readable explanation;
- `importance`: number between `0` and `1`.

See `dataset/README.md` and `dataset/schemas/media.schema.json` for the full data contract.

## Validation And Tests

Run from the repository root:

```bash
python scripts/validate_data.py
```

Run API tests:

```bash
cd apps/api
python -m pytest -q
```

Run frontend checks:

```bash
cd apps/web
npm run lint
npm run build
```

Run an API smoke test from the repository root:

```bash
python scripts/smoke_api.py
```

## Deployment

The repository includes GitHub Actions workflows for:

- building and publishing Docker images to GitHub Container Registry;
- deploying the API and web services from `stable` with `docker-compose.server.yml`;
- regenerating release notes so stable releases list the feature PRs merged into `main`.

`GITHUB_TOKEN` is provided automatically by GitHub Actions for GHCR authentication. A self-hosted Linux runner with Docker access is required for the deployment workflow.

## Documentation

- API details: `apps/api/README.md`
- Frontend details: `apps/web/README.md`
- Dataset details: `dataset/README.md`
