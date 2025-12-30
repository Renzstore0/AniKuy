import { Router } from "express";
import { fetchCached } from "../services/fetchCached.js";
import { DRAMA_API_BASE, DRAMA_DOWNLOAD_BASE } from "../services/sources.js";
import { buildUrl } from "../utils/buildUrl.js";

export const dramaRouter = Router();

dramaRouter.get("/recommend", async (req, res, next) => {
  try {
    const url = buildUrl(DRAMA_API_BASE, "recommend", req.query);
    const data = await fetchCached(url, { ttlSeconds: 120 });
    res.json(data);
  } catch (e) { next(e); }
});

dramaRouter.get("/home", async (req, res, next) => {
  try {
    const url = buildUrl(DRAMA_API_BASE, "home", req.query);
    const data = await fetchCached(url, { ttlSeconds: 120 });
    res.json(data);
  } catch (e) { next(e); }
});

dramaRouter.get("/search", async (req, res, next) => {
  try {
    const url = buildUrl(DRAMA_API_BASE, "search", req.query);
    const data = await fetchCached(url, { ttlSeconds: 120 });
    res.json(data);
  } catch (e) { next(e); }
});

dramaRouter.get("/vip", async (req, res, next) => {
  try {
    const url = buildUrl(DRAMA_API_BASE, "vip", req.query);
    const data = await fetchCached(url, { ttlSeconds: 3600 });
    res.json(data);
  } catch (e) { next(e); }
});

dramaRouter.get("/categories", async (req, res, next) => {
  try {
    const url = buildUrl(DRAMA_API_BASE, "categories", req.query);
    const data = await fetchCached(url, { ttlSeconds: 86400 });
    res.json(data);
  } catch (e) { next(e); }
});

dramaRouter.get("/category/:id", async (req, res, next) => {
  try {
    const url = buildUrl(DRAMA_API_BASE, `category/${req.params.id}`, req.query);
    const data = await fetchCached(url, { ttlSeconds: 300 });
    res.json(data);
  } catch (e) { next(e); }
});

// detail drama -> list episode
dramaRouter.get("/detail/:bookId", async (req, res, next) => {
  try {
    const url = `${DRAMA_DOWNLOAD_BASE}/${req.params.bookId}`;
    const data = await fetchCached(url, { ttlSeconds: 86400 });
    res.json(data);
  } catch (e) { next(e); }
});

// stream url
dramaRouter.get("/stream", async (req, res, next) => {
  try {
    const url = buildUrl(DRAMA_API_BASE, "stream", req.query);
    const data = await fetchCached(url, { ttlSeconds: 30 });
    res.json(data);
  } catch (e) { next(e); }
});
