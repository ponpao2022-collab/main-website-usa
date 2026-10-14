# Top USA News Story — workflow and project memory

Last updated: 2026-10-14 (Asia/Phnom_Penh).
This is the handoff document for future work. Check the source and live site before treating historical verification as current behavior. Update this file when a lasting decision changes.

## Project locations

- Website: https://topusanewsstory.com
- CMS: `https://topusanewsstory.com/${ADMIN_PATH}` (configured via private environment variable)
- Editor: https://topusanewsstory.com/article/new
- Workspace: `/home/pao/Documents/Website`
- Repository: https://github.com/ponpao2022-collab/main-website-usa.git
- Current deployment branch: `main`; use `codex/` for new task branches unless requested otherwise.
- Stack: Bun, Hono, SQLite in WAL mode, Cloudflare.
- Production checkout: `/var/www/news`; service: `news-app`.
- Persistent production database: `/var/www/data/news.sqlite`.
- Uploaded media: `media/` beside the selected database (production: `/var/www/data/media`).
- `DB_PATH` overrides the database location; `PORT` controls the listener.

## User preferences and accepted decisions

- Communicate briefly, usually in Khmer, using plain language. Act on requested fixes and verify the result instead of stopping at a plan.
- The user has authorized pushing and deploying website changes in this conversation. Keep the current task's scope and any later instructions in mind.
- Keep CMS and Post Editor modern and uncluttered: readable headings, restrained cards/borders, useful spacing, and real SVG icons.
- Use local SVG country flags and device/platform icons; emoji flags do not render reliably in all browsers.
- Author display/default is **Admin**. Show the available Admin photo instead of a letter avatar when a photo exists.
- Keep TK Editorial tools inside the Post Editor. Do not re-add duplicate TK Tools or View Website sidebar tabs; the website action is already in the top bar.
- Category management should follow the same CMS design.
- Category entries automatically follow NEWS in desktop and mobile navigation, in database ID order. Skip the News category to avoid duplicating NEWS. All primary/mobile menu labels display in uppercase. Category links open their corresponding article list and show the active state.
- When a reversible trial is requested, retain a practical rollback path.

## Post Editor and import workflow

1. Enter a source URL in TK Tools and fetch it.
2. Review the headline, summary, and body before formatting or rewriting.
3. Choose a preset or AI action. Gemini key entry remains visible in TK Tools; it is saved in that browser's local storage. Never put actual keys in this document, commits, or screenshots.
4. Review source links/social links and any preview content. Imported headings should decode HTML entities and remove redundant source-site suffixes.
5. Fetch collects available images separately. **Do not automatically inject images into the article or automatically assign the thumbnail.** The user chooses where to inject them.
6. Image Studio supports crop/resize/edit, thumbnail selection, and insertion at the saved editor cursor. Imported image wrappers must not retain unwanted source links when inserting an edited image.
7. Export/upload as clear WebP images **under 50 KB**. Preserve quality through resizing and compression; upload validation enforces the limit.
8. Save a draft or publish only when requested/appropriate to the task.

The thumbnail is for cards/previews; do not automatically repeat it as a hero image inside every article. Explicitly inserted body images remain visible. Visual, HTML, and split views must stay synchronized. Read More must preserve nested content and allow the remaining article to expand.

Fetch is best effort: login walls, anti-bot responses, unavailable sources, and unreadable markup can still prevent import. Do not promise that any URL can be fetched. Formatting without AI does not require a Gemini key; AI actions require the appropriate key and working provider response.

Relevant implementation: `src/routes/admin.ts`, `src/routes/api.ts`, `src/utils/article-import.ts`, `src/utils/article-display.ts`, `public/assets/freeFormat.js`, and editor media assets.

## Visitor performance and stylesheet rollback

Visitors use precompiled Tailwind CSS. CMS keeps its Tailwind runtime. The compiler is pinned to Tailwind **3.4.17**, matching the previous runtime.

```bash
bun install
bun run build:css
```

- Inputs: `styles/public.css`, `tailwind.public.config.cjs`, frontend/API templates, `public/assets/freeFormat.js`, and post HTML from the selected database.
- Builder: `scripts/build-public-css.ts` opens the database read-only, scans content, writes a hashed `public/assets/public-<hash>.css`, and updates `src/data/public-css.json`.
- `.cache/` holds temporary compilation inputs/output. Do not commit it.
- Optional `PUBLIC_CSS_SNAPSHOT` points to a local JSON article backup to include its post classes in a build. Do not commit the backup.
- Stage the generated stylesheet and manifest when source changes require CSS updates. `src/data/` matches an ignore rule, so the manifest may require `git add -f src/data/public-css.json`.
- Production deployment rebuilds CSS using `/var/www/data/news.sqlite`. New arbitrary utility classes in post HTML need a rebuild; category names alone do not need one.
- Hashed asset filenames support long-lived asset caching. Keep the runtime asset for the CMS and rollback.
- Rollback: set `PUBLIC_STYLE_ENGINE=runtime` for the service and restart it; the public layout then loads the previous runtime instead of static CSS. Revert the relevant code commit if a full rollback is required. Preserve the database and media.

Initial verification found roughly 33 KB of CSS versus 407 KB of runtime JavaScript before compression. This is a styling-payload comparison, not a measured percentage improvement in complete page loading. Article fonts/layout, Read More, and mobile navigation were checked. Do not claim guaranteed Instant Article speed.

## Live audience and date reports

- Active sessions are tracked in process memory; current readers are different from total pageviews.
- `audience_samples` stores peak observed concurrent readers per minute. History is also sampled by a one-minute timer.
- `pageview_events` records timestamped article views. These are server-observed events, not guaranteed unique human readers; cached pages may not reach the origin.
- Live audience supports 1 hour, 24 hours, 7 days, and custom ranges.
- Articles reports support date/time ranges for pageviews and article/published/draft/breaking totals.
- Article counts in a selected range use **article creation time** and current status, not a historical log of publication transitions.
- CMS date/time inputs use Phnom Penh time (UTC+7); stored range timestamps use UTC. Custom ranges have a 366-day limit, with an exclusive end.
- Historical event data begins at `analytics_started_at`. Older lifetime view counters cannot be reconstructed into earlier hourly/daily history.

Relevant files: `src/utils/analytics.ts`, `src/utils/tracker.ts`, `public/assets/cms-analytics.js`, and database schema initialization.

## Backup and restore

- CMS backup/export/import endpoints require editor authentication.
- SQLite download uses `db.serialize()` and includes committed changes still in WAL. The database file alone does not contain uploaded media.
- JSON backup v2 includes posts, categories, valid TK short links, and local WebP media. It is an article/content backup, not a full analytics/settings snapshot.
- Restore shows a preview and requires an explicit restore action. Test restores against a disposable database; never restore production just to check a button.
- Restore merges by post slug, preserves existing post IDs, remaps categories, and restores links/media. Invalid payloads must roll back database changes.
- Limits: 50 MB import request; 1–10,000 articles per backup.
- JSON restores were tested for IDs, links, media, and invalid-input rollback. SQLite snapshot was tested with a committed row still in WAL.
- The deployment endpoint currently makes a raw database-file copy and retains the latest 20 backups. **This is not the same WAL-safe snapshot used by the CMS download endpoint.** Before migration or recovery-sensitive work, obtain a consistent SQLite backup plus media; do not assume a live raw file copy contains all recent writes.

Relevant file: `src/utils/backups.ts`; tests: `tests/backups.test.ts`.

## Development and verification

Inspect status and applicable local instructions before editing. Never stage unrelated user changes.

```bash
bun install
DB_PATH=/tmp/topusanews-preview.sqlite PORT=3001 bun run src/index.ts
bunx tsc --noEmit
bun test
git diff --check
```

Use a disposable database copy for preview/testing. Do not point tests at production. `bun check` in the existing package script is not the established TypeScript check; use `bunx tsc --noEmit`.

Test the behavior affected by the change. For layout/navigation work, inspect desktop and mobile, capture the final result, and verify relevant controls. Do not navigate away from the user's live editor or lose their unsaved work; use a separate temporary tab and close previews afterward.

At the last implementation check: 18 tests passed, covering import, editor behavior, media validation, category menus, dashboard icons, analytics, and backups. This is historical evidence; rerun appropriate checks for subsequent code changes.

`news.sqlite` has an incidental local modification from prior database work. **Do not commit it**, WAL/SHM files, credentials, or backup exports. Stage named code/assets rather than `git add -A`.

## Push and deploy procedure

1. Check the diff, build CSS if needed, and run relevant checks.
2. Stage only the intended files; commit with a descriptive message.
3. Push to the approved deployment branch.
4. Trigger the deploy endpoint over HTTPS using the `x-deploy-secret` header with the configured secret from the authorized environment. Do not put secrets in the URL or this document.
5. The endpoint fetches code, resets the production checkout to `origin/main`, installs dependencies, builds visitor CSS against the persistent database, and restarts `news-app`.
6. A successful trigger response only means the background job started. Verify the live page and a concrete changed behavior/asset before reporting deployment complete.

```bash
git add <intended-files>
git commit -m "Describe the change"
git push origin main
curl --fail-with-body --silent --show-error --max-time 20 \
  -X POST -H "x-deploy-secret: ${DEPLOY_SECRET}" \
  https://topusanewsstory.com/api/system/deploy
```

The existing `scripts/auto-deploy.sh` stages everything and sends a secret in an HTTP URL. Do not use that helper as the deployment workflow until it is corrected. In the Codex environment, Git writes/network may require sandbox escalation; existing user authorization still applies.

The cache refresh endpoint currently simulates a purge; do not claim it invalidates Cloudflare globally. Public HTML advertises a 60-second shared cache and 300-second stale-while-revalidate window, so menu/category changes may take time to appear through a cache. Restarting the service is not a guarantee of zero downtime.

## Migration and recovery checklist

- Obtain a consistent full SQLite backup and copy the media directory. Preserve short links, settings, and analytics when migrating the complete site.
- Install Bun/dependencies and clone the repository on the destination.
- Restore data outside the Git checkout; configure `DB_PATH`, `PORT`, and deployment secret appropriately.
- Build visitor CSS using the restored database. Configure the service using the verified production service name/environment rather than an outdated sample.
- Verify public articles, media, TK redirects, CMS login, and backups before switching DNS.
- Change the Cloudflare A record when the destination is ready. DNS/cache timing varies; verify afterward instead of promising a fixed migration time.

## Recent implementation checkpoints

- `61756ee`: CMS popups, backup/restore, audience history, date reports.
- `f870f2f`: precompiled visitor CSS with runtime rollback.
- `94281e8`: automatic category navigation after NEWS.
- `239824a`: uppercase desktop/mobile menu labels.

These are reference points, not permission to reset unrelated later work.
