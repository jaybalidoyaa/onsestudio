# Brigada Onse SVFAR Studio

Standalone **Emergency Response Photo Documentation Studio** for Brigada Onse /
Sun Valley Fire and Rescue — incident photo framing, batch processing, and album
archival.

made with love by finest 12

## Access

The Studio is **private**. First launch creates an administrator account. Only
signed-in users can use the app.

Roles:

- **Administrator** — users, Facebook settings, full Studio access
- **Documentation Officer** — process photos, frames, albums, Facebook posts
- **Viewer** — Gallery browse / download only

## Features

- **Studio** — upload photos, metadata, user frame overlays, preview, export
- **Gallery** — albums with search, filters, viewer, ZIP download
- **Facebook Page posting** — compose caption + photos and publish via Graph API
- **Fixed output** — processed photos at **940 × 788 px**
- **Local-first** — IndexedDB for users, sessions, frames, albums, settings

## Facebook setup

1. Create a Meta developer app
2. Generate a **Page Access Token** with `pages_manage_posts` (and photo upload)
3. In Studio → Settings → Facebook, paste **Page ID** and token
4. Use **Test Connection**, then post from any album via **Post to Facebook**

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
