import { Database } from "bun:sqlite";
import path from "path";
import fs from "fs";

// Determine persistent DB location
let dbPath = "news.sqlite";

if (process.env.DB_PATH) {
  dbPath = process.env.DB_PATH;
} else if (fs.existsSync("/var/www") || process.env.NODE_ENV === "production") {
  const persistentDir = "/var/www/data";
  try {
    if (!fs.existsSync(persistentDir)) {
      fs.mkdirSync(persistentDir, { recursive: true });
    }
    const targetDb = path.join(persistentDir, "news.sqlite");
    // If persistent DB doesn't exist yet, migrate existing news.sqlite
    if (!fs.existsSync(targetDb)) {
      const candidates = [
        path.join(process.cwd(), "news.sqlite"),
        "/var/www/news/news.sqlite",
        "news.sqlite"
      ];
      for (const src of candidates) {
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, targetDb);
          console.log(`[DB] Successfully migrated database from ${src} to persistent storage: ${targetDb}`);
          break;
        }
      }
    }
    dbPath = targetDb;
  } catch (e) {
    console.error("[DB] Could not initialize /var/www/data, using local fallback:", e);
    dbPath = "news.sqlite";
  }
}

console.log(`[DB] Database active at: ${dbPath}`);
const db = new Database(dbPath, { create: true });

// Enable WAL mode & high-speed memory caching for ultra-low latency (<0.05ms)
db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA synchronous = NORMAL;");
db.exec("PRAGMA cache_size = -64000;"); // 64MB in-memory page cache
db.exec("PRAGMA temp_store = MEMORY;");
db.exec("PRAGMA mmap_size = 268435456;"); // 256MB memory-mapped I/O

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

  CREATE TABLE IF NOT EXISTS short_links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
    clicks INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_short_links_code ON short_links(code);
  CREATE INDEX IF NOT EXISTS idx_short_links_post ON short_links(post_id);
  CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts(slug);
  CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
  CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at);
`);

// Safe migrations for existing DB
try {
  db.exec("ALTER TABLE posts ADD COLUMN tags TEXT;");
} catch (e) {
  // column already exists
}

// Seed Categories if empty (only NEWS by default)
const catCount = db.query("SELECT COUNT(*) as count FROM categories").get() as { count: number };
if (catCount.count === 0) {
  const insertCat = db.prepare("INSERT INTO categories (name, slug, color) VALUES (?, ?, ?)");
  insertCat.run("NEWS", "news", "#c25e3e");
}

export { db, dbPath };
