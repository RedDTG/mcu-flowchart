# Web App Placeholder

This folder is reserved for the future frontend application (recommended: Next.js).

## Recommended Bootstrap

From repository root:

```powershell
npx create-next-app@latest apps/web --ts --eslint --src-dir --app --use-npm
```

Then start the frontend:

```powershell
Set-Location apps/web
npm run dev
```

## API Integration Convention

- Environment variable: `NEXT_PUBLIC_API_BASE_URL`
- Recommended local value: `http://127.0.0.1:8000`
- Main API endpoint to consume first: `GET /api/v1/media` (returns media entries)

## Notes

- The backend already exposes OpenAPI docs at `http://127.0.0.1:8000/docs`.
- Dataset includes `poster` local paths such as `/posters/iron-man.jpg` and media type values (`movie`, `show`, `special`).
