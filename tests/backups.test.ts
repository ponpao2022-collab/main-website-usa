import { expect, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { exportArticleBackup, restoreArticleBackup } from '../src/utils/backups';
process.env.DB_PATH = ':memory:';
const { db: applicationDb } = await import('../src/db');
const schema = (applicationDb.query("SELECT sql FROM sqlite_master WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%'").all() as { sql: string }[]).map(row => row.sql).join(';');
function fixture(filename = ':memory:') {
  const database = new Database(filename); database.exec(schema);
  database.query('INSERT INTO categories(id,name,slug) VALUES(1,?,?)').run('News', 'news');
  return database;
}

test('JSON backup restores posts, categories, links and media, and preserves existing post IDs', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cms-backup-test-'));
  const source = fixture(), target = fixture();
  try {
    source.query("INSERT INTO posts(id,title,slug,content,category_id,author_name,status,views) VALUES(10,'Article','article','<p>Body</p>',1,'Admin','draft',17)").run();
    source.query("INSERT INTO short_links(code,post_id,clicks) VALUES('abcdef',10,5)").run();
    const mediaDirectory = path.join(directory, 'source'); fs.mkdirSync(mediaDirectory);
    const name = '00000000-0000-0000-0000-000000000001.webp'; fs.copyFileSync('public/assets/logo-sm.webp', path.join(mediaDirectory, name));
    const payload = exportArticleBackup(source, mediaDirectory);
    target.query("INSERT INTO posts(id,title,slug,content,category_id) VALUES(44,'Old title','article','Old body',1)").run();
    target.query("INSERT INTO short_links(code,post_id,clicks) VALUES('ghijkl',44,3)").run();
    const result = restoreArticleBackup(target, payload, path.join(directory, 'restored'));
    expect(result.updated).toBe(1);
    const restored = target.query("SELECT * FROM posts WHERE slug='article'").get() as any;
    expect(restored.id).toBe(44); expect(restored.status).toBe('draft'); expect(restored.views).toBe(17);
    expect((target.query("SELECT post_id FROM short_links WHERE code='ghijkl'").get() as any).post_id).toBe(44);
    expect((target.query("SELECT post_id FROM short_links WHERE code='abcdef'").get() as any).post_id).toBe(44);
    expect(fs.readFileSync(path.join(directory, 'restored', name))).toEqual(fs.readFileSync('public/assets/logo-sm.webp'));
    expect(restoreArticleBackup(target, payload, path.join(directory, 'restored')).updated).toBe(1);
    expect((target.query('SELECT COUNT(*) AS count FROM posts').get() as any).count).toBe(1);
  } finally { source.close(); target.close(); fs.rmSync(directory, { recursive: true, force: true }); }
});
test('invalid restores roll back the entire merge and preserve existing posts', () => {
  const database = fixture(), directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cms-backup-rollback-'));
  try {
    const payload = { posts: [{ id: 1, title: 'New', slug: 'new', content: 'Body' }], short_links: [{ code: 'abcdef', post_id: 999 }] };
    expect(() => restoreArticleBackup(database, payload, directory)).toThrow('missing from the backup');
    expect((database.query('SELECT COUNT(*) AS count FROM posts').get() as any).count).toBe(0);
    expect(() => restoreArticleBackup(database, { posts: [{ title: 'Good' }, { title: null }] }, directory)).toThrow();
  } finally { database.close(); fs.rmSync(directory, { recursive: true, force: true }); }
});
test('SQLite snapshot includes a committed post still stored in the WAL', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cms-backup-wal-'));
  const database = fixture(path.join(directory, 'live.sqlite'));
  try {
    database.exec('PRAGMA journal_mode=WAL; PRAGMA wal_autocheckpoint=0;');
    database.query("INSERT INTO posts(title,slug,content) VALUES('Latest post','latest','WAL content')").run();
    expect(fs.statSync(path.join(directory, 'live.sqlite-wal')).size).toBeGreaterThan(0);
    fs.writeFileSync(path.join(directory, 'snapshot.sqlite'), database.serialize());
    const snapshot = new Database(path.join(directory, 'snapshot.sqlite'), { readonly: true });
    try { expect((snapshot.query("SELECT content FROM posts WHERE slug='latest'").get() as any).content).toBe('WAL content'); }
    finally { snapshot.close(); }
  } finally { database.close(); fs.rmSync(directory, { recursive: true, force: true }); }
});
