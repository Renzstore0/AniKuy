import express from "express";
import cors from "cors";
import compression from "compression";
import { animeRouter } from "./routes/anime.routes.js";
import { dramaRouter } from "./routes/drama.routes.js";
import { myListRouter } from "./routes/mylist.routes.js";

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(compression());
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_req, res) => res.json({ ok: true, name: "AniKuy API" }));

  app.use("/v1/anime", animeRouter);
  app.use("/v1/drama", dramaRouter);
  app.use("/v1/my-list", myListRouter);

  // error handler
  app.use((err: any, _req: any, res: any, _next: any) => {
    console.error(err);
    res.status(500).json({ ok: false, error: err?.message || "Internal error" });
  });

  return app;
}
