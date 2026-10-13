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
