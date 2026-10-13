import { Database } from "bun:sqlite";

const db = new Database("news.sqlite", { create: true });

// Enable WAL mode for high concurrency & speed
db.exec("PRAGMA journal_mode = WAL;");

// Initialize Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    color TEXT DEFAULT '#4f46e5'
  );

  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    summary TEXT,
    content TEXT NOT NULL,
    category_id INTEGER REFERENCES categories(id),
    author_name TEXT DEFAULT 'Sarah Jenkins',
    author_avatar TEXT DEFAULT 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    featured_image TEXT,
    read_time TEXT DEFAULT '5 min read',
    is_breaking INTEGER DEFAULT 0,
    is_featured INTEGER DEFAULT 0,
    is_trending INTEGER DEFAULT 0,
    status TEXT DEFAULT 'published', -- 'draft', 'published', 'scheduled'
    views INTEGER DEFAULT 0,
    tags TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

// Safe migrations for existing DB
try {
  db.exec("ALTER TABLE posts ADD COLUMN tags TEXT;");
} catch (e) {
  // column already exists
}

// Reset artificially inflated initial views back to genuine count
try {
  db.exec("UPDATE posts SET views = MAX(0, views - 1420) WHERE views >= 1420;");
} catch (e) {
  // ignore
}

// Seed Categories if empty (only NEWS by default)
const catCount = db.query("SELECT COUNT(*) as count FROM categories").get() as { count: number };
if (catCount.count === 0) {
  const insertCat = db.prepare("INSERT INTO categories (name, slug, color) VALUES (?, ?, ?)");
  insertCat.run("NEWS", "news", "#c25e3e");
}

// Clean initial setup - no mock demo posts seeded
export { db };
