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
    views INTEGER DEFAULT 1420,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

// Seed Categories if empty
const catCount = db.query("SELECT COUNT(*) as count FROM categories").get() as { count: number };
if (catCount.count === 0) {
  const insertCat = db.prepare("INSERT INTO categories (name, slug, color) VALUES (?, ?, ?)");
  insertCat.run("Technology", "technology", "#6366f1");
  insertCat.run("Business & Economy", "business", "#10b981");
  insertCat.run("Culture & Life", "culture", "#f59e0b");
  insertCat.run("World & Politics", "politics", "#ef4444");
  insertCat.run("Sports", "sports", "#06b6d4");
}

// Clean initial setup - no mock demo posts seeded
export { db };
