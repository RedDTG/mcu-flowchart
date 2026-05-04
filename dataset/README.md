# Dataset Documentation

This directory contains the shared metadata used by the API and frontend.

## Structure

```text
data/
  media/       # One JSON record per title
  posters/     # Poster assets referenced by media and saga metadata
  sagas/       # Saga metadata
  universes/   # Universe metadata
schemas/       # JSON Schema definitions
```

## Media Records

Each file in `data/media/*.json` must include:

- `id`: stable unique identifier;
- `title`: media title;
- `release_date`: ISO date format, `YYYY-MM-DD`;
- `universe`: universe id defined in `schemas/media.schema.json`;
- `mediatype`: `movie`, `show`, or `special`;
- `poster`: repository URL path, usually `/posters/<id>.jpg`;
- `summary`: non-empty description;
- `connections`: object with `required`, `optional`, and `references` arrays.

Optional media fields include:

- `end_date`: ISO date or `null`, useful for shows;
- `saga`: saga id;
- `phase`: integer or `null`.

## Connections

Connection items must target either:

- `media_id`: another media entry;
- `saga_id`: a saga, resolved by the API to the latest title in that saga.

They may also include:

- `reason`: short explanation shown to contributors and maintainers;
- `importance`: number between `0` and `1`.

Use relation groups consistently:

- `required`: important context for understanding the story;
- `optional`: useful but skippable context;
- `references`: callbacks, cameos, easter eggs, or lighter continuity links.

## Posters

- Store poster files in `data/posters/`.
- Prefer `<id>.jpg` when possible.
- Keep metadata paths as public URL paths, for example `/posters/iron-man.jpg`.

## Validation

Run from the repository root:

```bash
python scripts/validate_data.py
```

The validator checks schema compliance and reference integrity.
