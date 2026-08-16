# Onse Studio

Standalone **Emergency Response Photo Documentation Studio** for incident photo framing, batch processing, and album archival.

## Features

- **Studio** — upload photos, enter incident metadata, apply a user-provided frame overlay, preview, and export
- **User frames** — upload PNG/JPG/WEBP/SVG overlays; reusable frame library (IndexedDB)
- **Gallery** — completed documentation albums with search, filters, viewer, and ZIP download
- **Non-destructive** — originals preserved separately from processed outputs
- **Local-first** — sessions, frames, and albums stored in the browser

## Stack

React · TypeScript · Vite · Tailwind CSS · IndexedDB · JSZip

## Develop

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Workflow

1. Open **Studio**
2. Upload incident photographs
3. Enter event details
4. Upload your documentation frame (PNG with transparency recommended)
5. Preview → **Apply to All**
6. **Create Album** → opens in **Gallery**
7. Download individual photos or the full album ZIP
