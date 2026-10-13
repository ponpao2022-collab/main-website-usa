import { expect, test } from 'bun:test';
process.env.DB_PATH = ':memory:';
const { db } = await import('../src/db/index');
const { frontendRouter } = await import('../src/routes/frontend');

test('new categories appear after News in both menus with active state and safe labels', async () => {
  const inserted = db.prepare('INSERT INTO categories (name, slug) VALUES (?, ?)').run('Travel & <Culture>', 'travel-culture-menu-test');
  try {
    const html = await (await frontendRouter.request('/category/travel-culture-menu-test')).text();
    for (const label of ['Primary navigation', 'Mobile navigation']) {
      const menu = html.split('aria-label="' + label + '"')[1]!.split('</nav>')[0]!;
      expect(menu.indexOf('href="/category/travel-culture-menu-test"')).toBeGreaterThan(menu.indexOf('href="/news"'));
      expect(menu).toContain('Travel &amp; &lt;Culture&gt;');
      expect(menu).toContain('href="/category/travel-culture-menu-test" aria-current="page"');
      expect(menu).not.toContain('href="/category/news"');
    }
    db.prepare('DELETE FROM categories WHERE id = ?').run(inserted.lastInsertRowid);
    const afterDelete = await (await frontendRouter.request('/news')).text();
    expect(afterDelete).not.toContain('href="/category/travel-culture-menu-test"');
  } finally { db.prepare('DELETE FROM categories WHERE id = ?').run(inserted.lastInsertRowid); }
});
