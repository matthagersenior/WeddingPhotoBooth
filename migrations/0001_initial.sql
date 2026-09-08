CREATE TABLE IF NOT EXISTS photos (
  id TEXT PRIMARY KEY,
  guest_name TEXT,
  message TEXT,
  filter_id TEXT NOT NULL,
  image_key TEXT NOT NULL,
  thumb_key TEXT NOT NULL,
  image_type TEXT NOT NULL,
  thumb_type TEXT NOT NULL,
  upload_token_hash TEXT NOT NULL,
  image_uploaded INTEGER NOT NULL DEFAULT 0,
  thumb_uploaded INTEGER NOT NULL DEFAULT 0,
  hidden INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_photos_public
  ON photos(hidden, image_uploaded, thumb_uploaded, created_at DESC);
