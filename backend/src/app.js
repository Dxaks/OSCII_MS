import express from "express";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import router from "./routes/index.js";
import { ALLOWED_ORIGIN } from "./config.js";

const rootDir = fileURLToPath(new URL("../..", import.meta.url));
const distDir = path.resolve(rootDir, "dist");

export function createApp() {
  const app = express();

  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: true }));

  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,PUT,DELETE,OPTIONS");

    if (req.method === "OPTIONS") {
      return res.sendStatus(204);
    }

    next();
  });

  app.use("/api", router);

  if (existsSync(distDir)) {
    app.use(express.static(distDir));
    app.get(/^\/(?!api).*/, (_req, res) => {
      const indexFile = path.join(distDir, "index.html");
      if (existsSync(indexFile)) {
        res.sendFile(indexFile);
        return;
      }

      res.status(404).json({ message: "Frontend build not found" });
    });
  }

  app.use((req, res) => {
    res.status(404).json({ message: "Not found" });
  });

  app.use((error, _req, res, _next) => {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  });

  return app;
}
