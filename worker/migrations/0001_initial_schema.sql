-- ============================================================
-- Brigada Onse SVFAR Studio — D1 initial schema
-- ============================================================

-- ── Users ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  username      TEXT NOT NULL UNIQUE COLLATE NOCASE,
  display_name  TEXT NOT NULL,
  email         TEXT,
  callsign      TEXT,
  brigada_member INTEGER NOT NULL DEFAULT 0,   -- 0 | 1
  role          TEXT NOT NULL DEFAULT 'viewer', -- 'admin' | 'documenter' | 'viewer'
  password_salt TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  active        INTEGER NOT NULL DEFAULT 1,     -- 0 | 1
  last_login_at INTEGER,                        -- unix ms
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- ── Sessions ─────────────────────────────────────────────────
-- Server-side session tokens (JWT-signed; this table used for revocation)
CREATE TABLE IF NOT EXISTS sessions (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,               -- unix ms
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- ── App settings (single row) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS settings (
  id                          TEXT PRIMARY KEY DEFAULT 'app',
  -- Facebook
  fb_page_id                  TEXT NOT NULL DEFAULT '',
  fb_page_access_token        TEXT NOT NULL DEFAULT '',
  fb_page_name                TEXT NOT NULL DEFAULT '',
  fb_default_hashtags         TEXT NOT NULL DEFAULT '#BrigadaOnse #SVFAR #SunValleyFireAndRescue #Parañaque #EmergencyResponse',
  -- Email (Gmail SMTP via Worker)
  email_enabled               INTEGER NOT NULL DEFAULT 0,
  email_admin_notify          TEXT NOT NULL DEFAULT '',  -- where new-request alerts go
  -- Auth
  require_login               INTEGER NOT NULL DEFAULT 1,
  session_hours               INTEGER NOT NULL DEFAULT 12,
  updated_at                  INTEGER NOT NULL DEFAULT 0
);

INSERT OR IGNORE INTO settings (id, updated_at) VALUES ('app', 0);

-- ── Access requests ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS access_requests (
  id               TEXT PRIMARY KEY,
  is_brigada_member INTEGER NOT NULL DEFAULT 0,
  username         TEXT NOT NULL,
  email            TEXT NOT NULL,
  callsign         TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'approved' | 'rejected'
  rejection_reason TEXT,
  reviewed_at      INTEGER,
  reviewed_by      TEXT REFERENCES users(id),
  created_at       INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_access_requests_status ON access_requests(status);
CREATE INDEX IF NOT EXISTS idx_access_requests_created ON access_requests(created_at);

-- ── Albums ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS albums (
  id                   TEXT PRIMARY KEY,
  title                TEXT NOT NULL,
  incident_type        TEXT NOT NULL DEFAULT 'Other',
  date                 TEXT NOT NULL DEFAULT '',
  time                 TEXT NOT NULL DEFAULT '',
  location             TEXT NOT NULL DEFAULT '',
  address              TEXT NOT NULL DEFAULT '',
  alarm                TEXT NOT NULL DEFAULT '',
  unit                 TEXT NOT NULL DEFAULT '',
  callsign             TEXT NOT NULL DEFAULT '',
  barangay             TEXT NOT NULL DEFAULT '',
  city                 TEXT NOT NULL DEFAULT '',
  responding_units     TEXT NOT NULL DEFAULT '',
  documentation_officer TEXT NOT NULL DEFAULT '',
  notes                TEXT NOT NULL DEFAULT '',
  frame_id             TEXT,
  frame_name           TEXT NOT NULL DEFAULT '',
  cover_photo_id       TEXT,
  photo_count          INTEGER NOT NULL DEFAULT 0,
  status               TEXT NOT NULL DEFAULT 'draft', -- 'draft' | 'processing' | 'completed'
  created_at           INTEGER NOT NULL,
  updated_at           INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_albums_created ON albums(created_at);
CREATE INDEX IF NOT EXISTS idx_albums_updated ON albums(updated_at);

-- ── Album photos ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS album_photos (
  id           TEXT PRIMARY KEY,
  album_id     TEXT NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
  filename     TEXT NOT NULL,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  width        INTEGER NOT NULL DEFAULT 0,
  height       INTEGER NOT NULL DEFAULT 0,
  -- R2 object keys
  r2_original  TEXT NOT NULL,  -- albums/{albumId}/original/{id}
  r2_processed TEXT NOT NULL,  -- albums/{albumId}/processed/{id}
  r2_thumb     TEXT NOT NULL,  -- albums/{albumId}/thumb/{id}
  created_at   INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_album_photos_album ON album_photos(album_id, sort_order);

-- ── Frames ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS frames (
  id               TEXT PRIMARY KEY,
  name             TEXT NOT NULL,
  filename         TEXT NOT NULL,
  mime_type        TEXT NOT NULL DEFAULT 'image/png',
  width            INTEGER NOT NULL DEFAULT 0,
  height           INTEGER NOT NULL DEFAULT 0,
  has_transparency INTEGER NOT NULL DEFAULT 1,
  -- R2 object keys
  r2_blob          TEXT NOT NULL,   -- frames/{id}/original
  r2_thumb         TEXT NOT NULL,   -- frames/{id}/thumb
  created_at       INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_frames_created ON frames(created_at);

-- ── Activity log ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activity (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  username   TEXT NOT NULL,
  action     TEXT NOT NULL,
  detail     TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_activity_created ON activity(created_at DESC);
