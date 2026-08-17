# Brigada Onse SVFAR Studio — Cloudflare Worker API

Backend for the Brigada Onse SVFAR Studio frontend.  
Stack: **Cloudflare Workers** · **D1** (SQLite) · **R2** (object storage) · **MailChannels** (email)

---

## Prerequisites

- [Cloudflare account](https://dash.cloudflare.com/sign-up) (free tier covers everything)
- [Node.js](https://nodejs.org) 18+
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) installed globally:
  ```bash
  npm install -g wrangler
  wrangler login
  ```

---

## First-time setup

### 1. Install dependencies

```bash
cd worker
npm install
```

### 2. Create the D1 database

```bash
wrangler d1 create studio-db
```

Copy the `database_id` from the output and paste it into `wrangler.jsonc`:

```jsonc
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "studio-db",
    "database_id": "PASTE_YOUR_ID_HERE",   // ← here
    "migrations_dir": "migrations"
  }
]
```

### 3. Create the R2 bucket

```bash
wrangler r2 bucket create onse-studio-files
```

If you want a separate preview bucket for local dev:

```bash
wrangler r2 bucket create onse-studio-files-preview
```

### 4. Run the database migration

```bash
# Apply to remote (production) D1
npm run db:migrate:remote

# Apply to local D1 (for wrangler dev)
npm run db:migrate:local
```

### 5. Set secrets

These are never stored in source code. Run each command and paste the value when prompted:

```bash
# A random 64-character string — used to sign JWT session tokens
# Generate one: openssl rand -hex 32
wrangler secret put JWT_SECRET

# Your Gmail address (used as the "from" address in emails)
wrangler secret put GMAIL_USER

# A Gmail App Password (NOT your main Gmail password)
# Get one: myaccount.google.com → Security → 2-Step Verification → App passwords
wrangler secret put GMAIL_APP_PASSWORD
```

### 6. Update vars in wrangler.jsonc

Edit `wrangler.jsonc` and replace the placeholder values:

```jsonc
"vars": {
  "FRONTEND_URL": "https://your-pages-domain.pages.dev",
  "CORS_ORIGIN": "https://your-pages-domain.pages.dev"
}
```

For local development with the default Vite port:

```jsonc
"vars": {
  "FRONTEND_URL": "http://localhost:5173",
  "CORS_ORIGIN": "http://localhost:5173"
}
```

### 7. Set up email — add SPF DNS record

For MailChannels to send emails from your Gmail address, add this TXT record
to your domain's DNS:

| Type | Name | Value |
|------|------|-------|
| TXT  | `@`  | `v=spf1 include:relay.mailchannels.net ~all` |

If you already have an SPF record, append `include:relay.mailchannels.net`
before the `~all` mechanism.

> **Note:** Email works without this record but may land in spam. For
> `@gmail.com` sender addresses it works without a custom domain.

---

## Development

Run the Worker locally with a local D1 and R2:

```bash
npm run dev
# → http://localhost:8787
```

In the frontend root, create `.env.local`:

```env
VITE_API_URL=http://localhost:8787
```

Then start the frontend:

```bash
cd ..
npm run dev
# → http://localhost:5173
```

---

## Deployment

### Deploy the Worker

```bash
npm run deploy
```

The Worker URL will be printed after deploy, e.g.:
`https://onse-studio-api.<your-subdomain>.workers.dev`

### Deploy the frontend (Cloudflare Pages)

1. Push the repo to GitHub.
2. In the Cloudflare dashboard → **Pages** → **Create a project** → Connect to GitHub.
3. Build settings:
   - **Framework preset:** Vite
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Root directory:** `/` (repo root)
4. Add environment variable in Pages settings:
   - `VITE_API_URL` = `https://onse-studio-api.<your-subdomain>.workers.dev`
5. Update `wrangler.jsonc` vars to match the Pages URL and redeploy the Worker:
   ```bash
   # Update FRONTEND_URL and CORS_ORIGIN in wrangler.jsonc, then:
   npm run deploy
   ```

---

## API reference

All endpoints are prefixed with `/api`. Protected routes require:

```
Authorization: Bearer <jwt>
```

### Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/auth/setup` | — | First-run admin setup |
| `POST` | `/api/auth/login` | — | Login, returns JWT |
| `POST` | `/api/auth/logout` | ✓ | Revoke session |
| `GET`  | `/api/auth/me` | ✓ | Get current user |

### Users (admin only)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/users` | List all users |
| `POST` | `/api/users` | Create user |
| `PATCH` | `/api/users/:id` | Update role / active state |
| `POST` | `/api/users/:id/reset-password` | Reset password |
| `DELETE` | `/api/users/:id` | Delete user |

### Access requests

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/access-requests` | — | Submit (public) |
| `GET` | `/api/access-requests` | admin | List all |
| `POST` | `/api/access-requests/:id/approve` | admin | Approve + create user |
| `POST` | `/api/access-requests/:id/reject` | admin | Reject |

### Settings (admin only)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/settings` | Get all settings |
| `PATCH` | `/api/settings` | Update general settings |
| `PATCH` | `/api/settings/email` | Update email settings |
| `PATCH` | `/api/settings/facebook` | Update Facebook Page |

### Albums

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/albums` | ✓ | List all albums |
| `POST` | `/api/albums` | editor | Create album |
| `PATCH` | `/api/albums/:id` | editor | Update album |
| `DELETE` | `/api/albums/:id` | editor | Delete album + R2 files |
| `GET` | `/api/albums/:id/photos` | ✓ | List album photos |
| `POST` | `/api/albums/:id/photos` | editor | Upload photo (multipart) |
| `DELETE` | `/api/albums/:albumId/photos/:photoId` | editor | Delete photo |

### Frames

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/frames` | ✓ | List frames |
| `POST` | `/api/frames` | editor | Upload frame (multipart) |
| `PATCH` | `/api/frames/:id` | editor | Rename frame |
| `DELETE` | `/api/frames/:id` | editor | Delete frame |

### Files (R2 proxy)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/files/:key` | ✓ | Serve R2 object by key |

### Activity

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/activity?limit=40` | admin | Get activity log |

---

## Project structure

```
worker/
├── migrations/
│   └── 0001_initial_schema.sql   # D1 schema
├── src/
│   ├── index.ts                  # Entry point, router
│   ├── types.ts                  # Env bindings + D1 row types
│   ├── routes/
│   │   ├── auth.ts
│   │   ├── users.ts
│   │   ├── access.ts
│   │   ├── settings.ts
│   │   ├── albums.ts
│   │   ├── frames.ts
│   │   └── activity.ts
│   └── utils/
│       ├── auth.ts               # JWT middleware
│       ├── cors.ts
│       ├── crypto.ts             # PBKDF2 + HS256 JWT
│       ├── email.ts              # MailChannels sender
│       ├── r2.ts                 # R2 helpers
│       └── response.ts           # JSON response helpers
├── package.json
├── tsconfig.json
└── wrangler.jsonc
```
