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

// Seed Posts if empty
const postCount = db.query("SELECT COUNT(*) as count FROM posts").get() as { count: number };
if (postCount.count === 0) {
  const insertPost = db.prepare(`
    INSERT INTO posts (title, slug, summary, content, category_id, author_name, author_avatar, featured_image, read_time, is_breaking, is_featured, is_trending, status, views)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertPost.run(
    "The Green Revolution: Designing the Next-Generation Sustainable Cities of Tomorrow",
    "green-revolution-cities-of-tomorrow",
    "How modern urban architecture and AI-driven grid optimization are reshaping skylines into zero-carbon eco-hubs.",
    `<p class="lead">Urban sprawl is reaching an unprecedented crossroads. With over 60% of the world's population projected to reside in urban centers by 2030, architects and civil engineers are reinventing the very anatomy of our cities.</p>
    
    <h2>1. The Rise of Biophilic Architecture</h2>
    <p>Biophilic design integrates natural elements directly into urban concrete infrastructure. Vertical forests, rooftop solar gardens, and biological air purification corridors are no longer visionary concepts—they are becoming mandatory building codes in forward-thinking metropolises.</p>
    
    <blockquote class="my-6 border-l-4 border-indigo-500 pl-4 py-1 italic bg-indigo-500/10 rounded-r-lg">
      "We cannot simply build higher; we must build smarter, integrating biological ecosystems directly into our high-rise frameworks."
    </blockquote>

    <h2>2. Decentralized Renewable Microgrids</h2>
    <p>By leveraging decentralized edge power distribution, buildings now produce, store, and trade solar energy with neighboring structures using smart contracts and AI load-balancing.</p>`,
    1,
    "Sarah Jenkins",
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&auto=format&fit=crop&q=80",
    "6 min read",
    1, // Breaking
    1, // Featured
    0,
    "published",
    18450
  );

  insertPost.run(
    "Global Leaders Convene in Southeast Asia to Finalize Historic Digital Trade Agreement",
    "global-leaders-digital-trade-agreement",
    "Delegates from across 24 nations sign framework ensuring cross-border data security and rapid digital payments.",
    `<p>Economic representatives from across Asia-Pacific have signed a comprehensive multilateral pact designed to streamline international e-commerce, protect digital IP, and eliminate excessive payment processing fees.</p>
    <p>Under the new framework, cross-border digital transactions will benefit from standardized cryptographic protocols, drastically cutting clearance times from days to mere seconds.</p>`,
    2,
    "David Miller",
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=800&auto=format&fit=crop&q=80",
    "4 min read",
    1, // Breaking
    0,
    1, // Trending #1
    "published",
    9820
  );

  insertPost.run(
    "Rise of Quantum Computing: Why Encryption Standards Are Changing Forever",
    "rise-of-quantum-computing-encryption",
    "Security agencies and financial institutions begin global migration to post-quantum cryptography.",
    `<p>The race to construct fault-tolerant quantum computers has accelerated faster than projected. In response, global security authorities are deploying quantum-resistant cryptographic algorithms to secure national infrastructure.</p>`,
    1,
    "Alex Vance",
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800&auto=format&fit=crop&q=80",
    "5 min read",
    0,
    0,
    1, // Trending #2
    "published",
    7640
  );

  insertPost.run(
    "កម្ពុជាជំរុញការប្រើប្រាស់បច្ចេកវិទ្យាឌីជីថល និងប្រព័ន្ធទូទាត់អេឡិចត្រូនិកក្នុងវិស័យទេសចរណ៍",
    "cambodia-digital-tourism-payments",
    "ក្រសួង និងវិស័យឯកជនរួមគ្នាអភិវឌ្ឍប្រព័ន្ធទូទាត់ QR Code ឆ្លងដែន ដើម្បីសម្រួលដល់ភ្ញៀវទេសចរអន្តរជាតិ។",
    `<p>ការទូទាត់តាមប្រព័ន្ធឌីជីថល (Bakong QR) កំពុងក្លាយជាកម្លាំងចលករយ៉ាងសំខាន់ក្នុងការលើកកម្ពស់វិស័យទេសចរណ៍នៅកម្ពុជា។ ភ្ញៀវទេសចរអាចធ្វើការស្កេនទូទាត់ប្រាក់យ៉ាងងាយស្រួល និងរហ័សទាន់ចិត្ត។</p>
    <p>យោងតាមរបាយការណ៍ចុងក្រោយ កំណើននៃការប្រើប្រាស់ប្រព័ន្ធទូទាត់ឌីជីថលក្នុងចំណោមអាជីវកម្មទេសចរណ៍បានកើនឡើងគួរឱ្យកត់សម្គាល់ក្នុងរយៈពេលមួយឆ្នាំកន្លងមកនេះ។</p>`,
    2,
    "សុខ សុវណ្ណ",
    "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&auto=format&fit=crop&q=80",
    "3 នាទីអាន",
    0,
    0,
    1, // Trending #3
    "published",
    12400
  );

  insertPost.run(
    "The Modern Nomad Lifestyle: How Remote Work is Reshaping Southeast Asian Coastal Towns",
    "modern-nomad-lifestyle-coastal-towns",
    "From high-speed fiber internet in remote islands to co-living spaces, nomadic professionals are transforming local economies.",
    `<p>The shift toward location-independent careers has turned tranquil beach towns across Southeast Asia into thriving creative hubs. High-speed edge internet and decentralized work platforms allow engineers and designers to build global products from tropical shores.</p>`,
    3,
    "Sarah Jenkins",
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80",
    "7 min read",
    0,
    0,
    1, // Trending #4
    "published",
    5120
  );
}

export { db };
