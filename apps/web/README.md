# MCU Flowchart Web

Next.js frontend for browsing Marvel media metadata, relation graphs, and watching-order guidance.

## Features

- Responsive media browsing with poster artwork.
- Media detail pages with required, optional, and reference connections.
- Flowchart view powered by the API graph endpoint.
- Watching-order FAQ focused on release-order discovery.
- Dark UI built with Tailwind CSS.

## Requirements

- Node.js 24+
- API running locally on `http://localhost:8001`, or Docker Compose proxying the service internally

## Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3001`.

The app calls `/api/*`; `next.config.ts` rewrites those requests to the backend configured by `API_INTERNAL_URL`.

## Environment

```env
API_INTERNAL_URL=http://127.0.0.1:8001
```

## Scripts

- `npm run dev`: start the development server on port `3001`.
- `npm run lint`: run ESLint.
- `npm run build`: create a production build.
- `npm start`: serve the production build on port `3001`.

## API Usage

The frontend consumes:

- `GET /api/v1/media`
- `GET /api/v1/media/{media_id}`
- `GET /api/v1/universes`
- `GET /api/v1/sagas`
- `GET /api/v1/graph`
- `GET /api/v1/posters/{file}`

## Docker

The Docker image uses `API_INTERNAL_URL` at build time so the frontend can target the API service name in Compose, usually `http://api:8001`.
