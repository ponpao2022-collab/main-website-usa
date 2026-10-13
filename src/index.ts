import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { frontendRouter } from "./routes/frontend";
import { adminRouter } from "./routes/admin";
import { apiRouter } from "./routes/api";

const app = new Hono();

// Serve static assets from public directory with high-performance cache headers
app.use("/assets/*", async (c, next) => {
  await next();
  c.header("Cache-Control", "public, max-age=31536000, immutable");
});
app.use("/assets/*", serveStatic({ root: "./public" }));

// Mount Routers
app.route("/api", apiRouter);
app.route("/admin", adminRouter);
app.route("/", frontendRouter);

const PORT = Number(process.env.PORT) || 3000;

console.log(`
🚀 ========================================================
   THE CHRONICLE - NEXT-GEN NEWS CMS & HIGH-SPEED FRONTEND
   ========================================================
   🌐 Live News Website:   http://localhost:${PORT}/
   ⚡ NextGen Admin CMS:   http://localhost:${PORT}/admin
   📦 RESTful API:         http://localhost:${PORT}/api/posts
   ☁️  Edge CDN Sync:       Active (Cloudflare Ready)
   ========================================================
`);

export default {
  port: PORT,
  fetch: app.fetch,
};
