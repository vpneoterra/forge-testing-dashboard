import express from "express";
import { createServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function setupVite(app: express.Express, server: any) {
  const vite = await createServer({
    server: { middlewareMode: true, hmr: { server } },
    appType: "spa",
    root: path.resolve(__dirname, "../client"),
  });
  app.use(vite.middlewares);
  return vite;
}
