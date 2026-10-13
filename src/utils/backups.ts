import type { Database } from 'bun:sqlite';
import fs from 'node:fs';
import path from 'node:path';

const mediaName = /^[a-f0-9-]{36}\.webp$/;
export function exportArticleBackup(db: Database, mediaDirectory: string) {
  const posts = db.query('SELECT * FROM posts ORDER BY id DESC').all();
  const categories = db.query('SELECT * FROM categories ORDER BY id').all();
  const short_links = db.query('SELECT s.* FROM short_links s JOIN posts p ON p.id=s.post_id ORDER BY s.id').all();
  const media = fs.existsSync(mediaDirectory) ? fs.readdirSync(mediaDirectory).filter(name => mediaName.test(name)).map(name => ({ name, data: fs.readFileSync(path.join(mediaDirectory, name)).toString('base64') })) : [];
  return { export_date: new Date().toISOString(), version: '2.0', total_articles: posts.length, categories, posts, short_links, media };
}

export function restoreArticleBackup(db: Database, body: any, mediaDirectory: string) {
  const posts = Array.isArray(body) ? body : body?.posts;
  if (!Array.isArray(posts) || !posts.length || posts.length > 10000) throw Error('Choose a JSON backup containing 1–10,000 articles.');
  const categories = body.categories || [], links = body.short_links || [], media = body.media || [];
  if (![categories, links, media].every(Array.isArray)) throw Error('Invalid backup collections.');
  const slugs = new Set<string>();
  for (const post of posts) {
    if (!post || typeof post.title !== 'string' || !post.title.trim() || (post.content != null && typeof post.content !== 'string')) throw Error('Every article needs a valid title and article content.');
    if (post.status && !['published', 'draft', 'scheduled', 'trash'].includes(post.status)) throw Error('Invalid article status.');
    if (post.slug && (typeof post.slug !== 'string' || slugs.has(post.slug))) throw Error('Duplicate or invalid article slug.');
    if (post.slug) slugs.add(post.slug);
  }
  for (const category of categories) if (!category || typeof category.name !== 'string' || typeof category.slug !== 'string' || !category.slug) throw Error('Invalid category in backup.');
  for (const link of links) if (!link || typeof link.code !== 'string' || !/^[a-zA-Z0-9]{6}$/.test(link.code)) throw Error('Invalid TK Link in backup.');
  const mediaFiles = media.map((item: any) => {
    if (!item || typeof item.name !== 'string' || !mediaName.test(item.name) || typeof item.data !== 'string') throw Error('Invalid image in backup.');
    const bytes = Buffer.from(item.data, 'base64');
    if (bytes.length >= 50 * 1024 || bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WEBP') throw Error('Backup images must be WebP files under 50 KB.');
    const filename = path.join(mediaDirectory, item.name);
    if (fs.existsSync(filename) && !fs.readFileSync(filename).equals(bytes)) throw Error('An image with this filename already exists. Restore cancelled to protect it.');
    return { filename, bytes };
  });
  const newFiles: string[] = [];
  const restore = db.transaction(() => {
    const categoryIds = new Map<number, number>(), postIds = new Map<number, number>();
    for (const category of categories) {
      const existing = db.query('SELECT id FROM categories WHERE slug = ?').get(category.slug) as any;
      const id = existing?.id || Number(db.query('INSERT INTO categories(name,slug,color) VALUES(?,?,?)').run(category.name, category.slug, category.color || '#c25e3e').lastInsertRowid);
      if (existing) db.query('UPDATE categories SET name=?, color=? WHERE id=?').run(category.name, category.color || '#c25e3e', id);
      categoryIds.set(Number(category.id), id);
    }
    const columns = ['title', 'slug', 'summary', 'content', 'category_id', 'author_name', 'author_avatar', 'featured_image', 'read_time', 'is_breaking', 'is_featured', 'is_trending', 'status', 'views', 'tags', 'created_at', 'updated_at'];
    const insert = db.prepare('INSERT INTO posts(' + columns.join(',') + ') VALUES(' + columns.map(() => '?').join(',') + ')');
    const update = db.prepare('UPDATE posts SET ' + columns.map(column => column + ' = ?').join(',') + ' WHERE id = ?');
    let added = 0, updated = 0;
    for (const post of posts) {
      const slug = post.slug || post.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + crypto.randomUUID().slice(0, 8);
      const existing = db.query('SELECT id FROM posts WHERE slug = ?').get(slug) as any;
      const originalCategory = Number(post.category_id);
      const categoryExists = db.query('SELECT id FROM categories WHERE id = ?').get(originalCategory) as any;
      const defaultCategory = db.query('SELECT id FROM categories ORDER BY id LIMIT 1').get() as any;
      const categoryId = categoryIds.get(originalCategory) || (!categories.length && categoryExists?.id) || defaultCategory?.id || null;
      const author = ['Editorial Staff', 'Editional Staff'].includes(post.author_name) ? 'Admin' : post.author_name || 'Admin';
      const values = [post.title, slug, post.summary || '', post.content || '', categoryId, author, post.author_avatar || '', post.featured_image || '', post.read_time || '4 min read', post.is_breaking ? 1 : 0, post.is_featured ? 1 : 0, post.is_trending ? 1 : 0, post.status || 'published', Math.max(0, Number(post.views) || 0), post.tags || null, post.created_at || new Date().toISOString(), post.updated_at || new Date().toISOString()];
      const id = existing?.id || Number(insert.run(...values).lastInsertRowid);
      if (existing) { update.run(...values, id); updated++; } else added++;
      postIds.set(Number(post.id), id);
    }
    for (const link of links) {
      const postId = postIds.get(Number(link.post_id));
      if (!postId) throw Error('A TK Link points to an article missing from the backup.');
      const existing = db.query('SELECT post_id FROM short_links WHERE code = ?').get(link.code) as any;
      if (existing && existing.post_id !== postId) throw Error('A TK Link conflicts with an existing article. Restore cancelled.');
      db.query('INSERT INTO short_links(code,post_id,clicks,created_at) VALUES(?,?,?,?) ON CONFLICT(code) DO UPDATE SET clicks=excluded.clicks').run(link.code, postId, Math.max(0, Number(link.clicks) || 0), link.created_at || new Date().toISOString());
    }
    if (mediaFiles.length) fs.mkdirSync(mediaDirectory, { recursive: true });
    for (const file of mediaFiles) if (!fs.existsSync(file.filename)) { fs.writeFileSync(file.filename, file.bytes); newFiles.push(file.filename); }
    return { added, updated, total: posts.length, links: links.length, images: mediaFiles.length };
  });
  try { return restore(); } catch (error) { for (const filename of newFiles) fs.unlinkSync(filename); throw error; }
}
