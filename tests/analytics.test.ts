import { expect, test } from 'bun:test';
process.env.DB_PATH = ':memory:';
const { db } = await import('../src/db');
const { analyticsForRange, recordPageview, recordAudienceSample } = await import('../src/utils/analytics');
test('date reports count only views and articles within the requested range', () => {
  const start = Date.parse('2026-10-14T00:00:00Z'), end = start + 3600000;
  const result = db.query("INSERT INTO posts(title,slug,content,status,views,created_at) VALUES('Report test','analytics-report-test','Body','published',19,'2026-10-14 00:20:00')").run();
  const id = Number(result.lastInsertRowid);
  try {
    recordPageview(id, start + 1000); recordPageview(id, end + 1000);
    recordAudienceSample(2, start + 2000); recordAudienceSample(5, start + 3000); recordAudienceSample(1, start + 61000);
    const report = analyticsForRange(start, end);
    expect(report.totals.pageviews).toBe(1); expect(report.totals.published).toBe(1);
    expect((report.audience[0] as any).readers).toBe(5);
    expect(analyticsForRange(null, null).totals.pageviews).toBeGreaterThanOrEqual(19);
    expect(() => analyticsForRange(end, start)).toThrow();
    expect(() => analyticsForRange(start, start + 400 * 86400000)).toThrow();
  } finally { db.query('DELETE FROM pageview_events WHERE post_id=?').run(id); db.query('DELETE FROM posts WHERE id=?').run(id); db.query('DELETE FROM audience_samples WHERE minute>=? AND minute<?').run(start, end); }
});
