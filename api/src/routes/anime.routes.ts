import { Router } from "express";
import { fetchCached } from "../services/fetchCached.js";
import { SANKA_BASE } from "../services/sources.js";
import { buildUrl } from "../utils/buildUrl.js";

export const animeRouter = Router();

animeRouter.get("/home", async (req, res, next) => {
  try {
    const url = buildUrl(SANKA_BASE, "home", req.query);
    const data = await fetchCached(url, { ttlSeconds: 60 });
    res.json(data);
  } catch (e) { next(e); }
});

animeRouter.get("/schedule", async (req, res, next) => {
  try {
    const url = buildUrl(SANKA_BASE, "schedule", req.query);
    const data = await fetchCached(url, { ttlSeconds: 300 });
    res.json(data);
  } catch (e) { next(e); }
});

animeRouter.get("/ongoing", async (req, res, next) => {
  try {
    const url = buildUrl(SANKA_BASE, "ongoing-anime", req.query);
    const data = await fetchCached(url, { ttlSeconds: 300 });
    res.json(data);
  } catch (e) { next(e); }
});

animeRouter.get("/completed", async (req, res, next) => {
  try {
    const url = buildUrl(SANKA_BASE, "completeanime", req.query);
    const data = await fetchCached(url, { ttlSeconds: 3600 });
    res.json(data);
  } catch (e) { next(e); }
});

animeRouter.get("/search/:q", async (req, res, next) => {
  try {
    const url = buildUrl(SANKA_BASE, `search/${encodeURIComponent(req.params.q)}`, req.query);
    const data = await fetchCached(url, { ttlSeconds: 300 });
    res.json(data);
  } catch (e) { next(e); }
});

animeRouter.get("/genre", async (req, res, next) => {
  try {
    const url = buildUrl(SANKA_BASE, "genre", req.query);
    const data = await fetchCached(url, { ttlSeconds: 86400 });
    res.json(data);
  } catch (e) { next(e); }
});

animeRouter.get("/genre/:slug", async (req, res, next) => {
  try {
    const url = buildUrl(SANKA_BASE, `genre/${req.params.slug}`, req.query);
    const data = await fetchCached(url, { ttlSeconds: 600 });
    res.json(data);
  } catch (e) { next(e); }
});

animeRouter.get("/anime/:slug", async (req, res, next) => {
  try {
    const url = buildUrl(SANKA_BASE, `anime/${req.params.slug}`, req.query);
    const data = await fetchCached(url, { ttlSeconds: 86400 });
    res.json(data);
  } catch (e) { next(e); }
});
