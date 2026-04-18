# Dataset Documentation

This folder contains the shared MCU media dataset used by the API (and future frontend).

## Structure

```text
data/
  movies/     # JSON media records (historical folder name kept for compatibility)
posters/      # Local poster files referenced by `poster`
schemas/      # JSON schema definitions
```

## Media Record Spec

Each JSON file in `data/media/*.json` must include:

- `id`: unique identifier (string)
- `title`: media title (string)
- `release_date`: ISO date format (`YYYY-MM-DD`)
- `saga`: saga name (`Infinite Saga` or `Multiverse Saga`)
- `mediatype`: media kind, one of `movie`, `show`, `special`
- `poster`: poster path (example: `/posters/iron-man.jpg`)
- `summary`: non-empty description
- `connections`: object with `required`, `optional`, and `references` arrays

Connection items require:

- `media_id`: target media identifier

Optional connection fields:

- `reason`: text explanation
- `importance`: number between `0` and `1`

## Poster Naming Convention

- Keep poster files in `dataset/posters/`
- Use the media id as filename when possible
- Recommended format: `<id>.jpg`
- Keep `poster` values as repository-relative URL paths (example: `/posters/<id>.jpg`)

## Validation

Run from repository root:

```powershell
python scripts\validate_data.py
```

This checks schema compliance and reference integrity.
