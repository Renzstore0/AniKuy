# AniKuy (Next.js + Express + MongoDB)

Project ini dipisah rapih:
- `web/` = Next.js (Frontend) — deploy ke Vercel
- `api/` = Express (Backend API + cache Mongo) — deploy ke Railway/Render
- MongoDB = Atlas (cache + My List)

> Catatan: pastikan kamu punya izin/rights untuk konten yang kamu tampilkan.

---

## 1) Menjalankan lokal

### A. Backend (Express)
1. Masuk folder:
   ```bash
   cd api
   ```
2. Copy env:
   ```bash
   cp .env.example .env
   ```
3. Isi `MONGODB_URI` di `.env`
4. Install + run:
   ```bash
   npm i
   npm run dev
   ```

Backend jalan di `http://localhost:4000`

### B. Frontend (Next.js)
1. Masuk folder:
   ```bash
   cd web
   ```
2. Copy env:
   ```bash
   cp .env.example .env.local
   ```
3. Isi `NEXT_PUBLIC_API_BASE`, contoh:
   ```env
   NEXT_PUBLIC_API_BASE=http://localhost:4000
   ```
4. Install + run:
   ```bash
   npm i
   npm run dev
   ```

Frontend jalan di `http://localhost:3000`

---

## 2) Deploy

### A. API (Railway/Render)
Set env:
- `MONGODB_URI`
- `NODE_ENV=production`

Start command:
- `npm run start`

### B. Web (Vercel)
Set env:
- `NEXT_PUBLIC_API_BASE=https://<domain-api-kamu>`

---

## 3) Routes utama

Frontend:
- `/home`
- `/explore`
- `/my-list`
- `/profile`
- Anime:
  - `/anime/ongoing`
  - `/anime/completed`
  - `/anime/schedule`
  - `/anime/genres`
  - `/anime/genre/[slug]`
  - `/anime/[slug]`
  - `/anime/search?q=...`
- Short Drama:
  - `/drama/home`
  - `/drama/recommend`
  - `/drama/vip`
  - `/drama/categories`
  - `/drama/category/[id]`
  - `/drama/[bookId]`
  - `/drama/watch/[bookId]/[episode]`
  - `/drama/search?q=...`

Backend API:
- `/v1/anime/*`
- `/v1/drama/*`
- `/v1/my-list/*`

