# MCU Flowchart - Web Frontend

A Next.js application that displays Marvel Cinematic Universe media with a responsive gallery interface.

## Features

- **Media Gallery**: Browse all MCU media with poster images
- **Media Details**: View detailed information including saga, `release_date`, and connections
- **Responsive Design**: Tailored experience for mobile, tablet, and desktop
- **Dark Theme**: Optimized UI with Tailwind CSS

## Prerequisites

- Node.js v24.14.1 (or compatible version)
- Backend API running on `http://localhost:8001`

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Generate Poster Images (Optional)

If poster SVG files are missing:

```bash
node generate-posters.js
```

### 3. Configure API URL

Edit `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8001
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3001](http://localhost:3001) to view the application.

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Home page with media gallery
│   ├── media/
│   │   └── [id]/page.tsx     # Individual media detail page
│   ├── layout.tsx            # Root layout
│   └── globals.css           # Global styles
├── components/
│   └── MediaGallery.tsx      # Media gallery component
└── ...

public/
├── posters/                  # Generated poster images (SVG)
└── ...
```

## API Integration

The frontend consumes the following endpoints:

- `GET /api/v1/media` - List all media
- `GET /api/v1/media/{media_id}` - Get individual media details

## Building for Production

```bash
npm run build
npm start
```

## Linting

```bash
npm run lint
```
