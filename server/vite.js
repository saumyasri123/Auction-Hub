// server/vite.jsx
import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer, createLogger } from "vite";
import viteConfig from "../vite.config.js";
import { nanoid } from "nanoid";

const viteLogger = createLogger();

function getDirname(metaUrl) {
  const __filename = fileURLToPath(metaUrl);
  return path.dirname(__filename);
}

export function log(message, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server }, // use same HTTP server for HMR
    // allowedHosts: ["localhost"], // add if you really need host filtering
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        // Log errors but don't kill the dev server
        viteLogger.error(msg, options);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);

  app.use("*", async (req, res, next) => {
    try {
      const __dirname = getDirname(import.meta.url);
      const clientTemplate = path.resolve(__dirname, "..", "client", "index.html");

      // Always read fresh copy during dev
      let template = await fs.promises.readFile(clientTemplate, "utf-8");

      // Optional: naive cache-bust for main.jsx during dev
      template = template.replace(
        /src="\/src\/main\.tsx"/,
        `src="/src/main.jsx?v=${nanoid()}"`
      );

      const page = await vite.transformIndexHtml(req.originalUrl, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}

export function serveStatic(app) {
  const __dirname = getDirname(import.meta.url);
  const distPath = path.resolve(__dirname, "..", "client", "dist");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
