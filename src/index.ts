import { dbPath } from "./db/index";
import path from "node:path";
import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { compress } from "hono/compress";
import { frontendRouter } from "./routes/frontend";
import { adminRouter } from "./routes/admin";
import { apiRouter } from "./routes/api";

const app = new Hono();

// Enable Gzip/Deflate compression for all responses
app.use(compress());

// Serve static assets and favicons from public directory
app.use("/assets/*", async (c, next) => {
  await next();
  c.header("Cache-Control", "public, max-age=31536000, immutable");
});
app.use("/assets/*", serveStatic({ root: "./public" }));
app.use("/favicon.ico", serveStatic({ path: "./public/favicon.ico" }));
app.use("/favicon.png", serveStatic({ path: "./public/favicon.png" }));
app.use("/apple-touch-icon.png", serveStatic({ path: "./public/apple-touch-icon.png" }));

app.get('/media/:name', async (c) => {
  const name = c.req.param('name');
  if (!/^[a-f0-9-]{36}\.webp$/.test(name)) return c.notFound();
  const file = Bun.file(path.join(path.dirname(dbPath), 'media', name));
  if (!(await file.exists())) return c.notFound();
  return new Response(file, { headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff' } });
});

import { ADMIN_PATH } from "./config";

// Mount Routers
app.route("/api", apiRouter);
app.route(`/${ADMIN_PATH}`, adminRouter);

// Block default /admin routes when custom admin path is configured
if (ADMIN_PATH !== "admin") {
  app.all("/admin", (c) => c.text("Not Found", 404));
  app.all("/admin/*", (c) => c.text("Not Found", 404));
}

app.route("/", frontendRouter);

const PORT = Number(process.env.PORT) || 3000;

console.log(`
🚀 ========================================================
   THE CHRONICLE - NEXT-GEN NEWS CMS & HIGH-SPEED FRONTEND
   ========================================================
   🌐 Live News Website:   http://localhost:${PORT}/
   ⚡ NextGen Admin CMS:   http://localhost:${PORT}/${ADMIN_PATH}
   📦 RESTful API:         http://localhost:${PORT}/api/posts
   ☁️  Edge CDN Sync:       Active (Cloudflare Ready)
   ========================================================
`);

export default {
  port: PORT,
  fetch: app.fetch,
};
