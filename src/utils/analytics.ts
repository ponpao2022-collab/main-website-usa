import { db } from '../db';
const day = 86400000;
export function recordPageview(postId: number, timestamp = Date.now()) {
  db.query('INSERT INTO pageview_events(post_id,viewed_at) VALUES(?,?)').run(postId, timestamp);
}
export function recordAudienceSample(readers: number, timestamp = Date.now()) {
  const minute = Math.floor(timestamp / 60000) * 60000;
  db.query('INSERT INTO audience_samples(minute,readers) VALUES(?,?) ON CONFLICT(minute) DO UPDATE SET readers=excluded.readers WHERE excluded.readers>audience_samples.readers').run(minute, readers);
}
export function analyticsForRange(start: number | null, end: number | null) {
  const lifetime = start == null || end == null;
  if (!lifetime && (!Number.isFinite(start) || !Number.isFinite(end) || end! <= start! || end! - start! > 366 * day)) throw Error('Choose an end after the start, within 366 days.');
  const from = start ?? 0, to = end ?? Date.now();
  const earliest = db.query("SELECT value FROM settings WHERE key='analytics_started_at'").get() as any;
  const counts = db.query(`SELECT COUNT(*) AS articles,
    SUM(CASE WHEN status='published' THEN 1 ELSE 0 END) AS published,
    SUM(CASE WHEN status='draft' THEN 1 ELSE 0 END) AS drafts,
    SUM(CASE WHEN is_breaking=1 THEN 1 ELSE 0 END) AS breaking,
    COALESCE(SUM(views),0) AS lifetimeViews FROM posts WHERE status!='trash'
    AND (?=1 OR (datetime(created_at)>=datetime(?) AND datetime(created_at)<datetime(?)))`)
    .get(lifetime ? 1 : 0, new Date(from).toISOString(), new Date(to).toISOString()) as any;
  const views = lifetime ? counts.lifetimeViews : (db.query('SELECT COUNT(*) AS count FROM pageview_events e JOIN posts p ON p.id=e.post_id WHERE p.status!=\'trash\' AND viewed_at>=? AND viewed_at<?').get(from, to) as any).count;
  const bucketMs = Math.max(60000, Math.ceil((to - from) / 120 / 60000) * 60000);
  const points = lifetime ? [] : db.query('SELECT CAST(minute / ? AS INTEGER) * ? AS time, MAX(readers) AS readers FROM audience_samples WHERE minute>=? AND minute<? GROUP BY time ORDER BY time').all(bucketMs, bucketMs, from, to);
  const viewPoints = lifetime ? [] : db.query('SELECT CAST(viewed_at / ? AS INTEGER) * ? AS time, COUNT(*) AS views FROM pageview_events WHERE viewed_at>=? AND viewed_at<? GROUP BY time ORDER BY time').all(bucketMs, bucketMs, from, to);
  return { start: from, end: to, lifetime, bucketMs, recordedSince: Number(earliest?.value || Date.now()), totals: { articles: counts.articles || 0, published: counts.published || 0, drafts: counts.drafts || 0, breaking: counts.breaking || 0, pageviews: views || 0 }, audience: points, pageviews: viewPoints };
}
