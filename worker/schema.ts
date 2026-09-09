const CREATE_PHOTOS_TABLE = `
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
)`;

const CREATE_PUBLIC_INDEX = `
CREATE INDEX IF NOT EXISTS idx_photos_public
ON photos(hidden, image_uploaded, thumb_uploaded, created_at DESC)
`;

let schemaReady: Promise<void> | null = null;

async function initializeSchema(db: D1Database): Promise<void> {
  await db.prepare(CREATE_PHOTOS_TABLE).run();
  await db.prepare(CREATE_PUBLIC_INDEX).run();
}

export function ensureSchema(db: D1Database): Promise<void> {
  schemaReady ??= initializeSchema(db).catch((error) => {
    schemaReady = null;
    throw error;
  });
  return schemaReady;
}
