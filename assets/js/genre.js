// assets/js/genre.js
(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const el = {
    title: $("genreTitle"),
    grid: $("genreAnimeGrid"),
    prev: $("genrePrevBtn"),
    next: $("genreNextBtn"),
    info: $("genrePageInfo"),
    sc: $("mainContent") || window,
  };

  const p = new URLSearchParams(location.search);
  const slug = p.get("slug");
  const name = p.get("name");

  let page = 1,
    last = 1,
    loading = false,
    hasMore = true;

  const OFFSET = 400;

  const hide = (...xs) => xs.forEach((x) => x && (x.style.display = "none"));

  const parseHrefSlug = (href) => {
    const s = String(href || "").trim();
    if (!s) return "";
    const parts = s.split("/").filter(Boolean);
    return parts[parts.length - 1] || "";
  };

  async function load(nextPage = 1) {
    if (!slug || !el.grid || loading || (!hasMore && nextPage > 1)) return;
    loading = true;
    if (nextPage === 1) el.grid.innerHTML = "";

    let json;
    try {
      json = await apiGet(
        `/anime/samehadaku/genres/${encodeURIComponent(slug)}?page=${encodeURIComponent(nextPage)}`
      );
    } catch {
      loading = false;
      return;
    }

    if (!json || json.status !== "success") return (loading = false);

    const list = Array.isArray(json?.data?.animeList) ? json.data.animeList : [];
    const pag = json.pagination || {};

    page = pag.currentPage || nextPage;
    last = pag.totalPages || last || page;
    hasMore = pag.hasNextPage === true || page < last;

    list.forEach((a) => {
      const item = {
        title: a?.title || "-",
        poster: a?.poster || "",
        slug: a?.animeId || parseHrefSlug(a?.href) || a?.slug || "",
        animeId: a?.animeId,
        rating: a?.score || "N/A",
        status: a?.status || "",
        type: a?.type || "",
      };

      // ✅ pakai fungsi card kamu (core.js)
      el.grid.appendChild(
        createAnimeCard(item, {
          rating: item.rating,
          badgeBottom: item.type || "",
          meta: item.status || "",
        })
      );
    });

    if (el.info) el.info.textContent = `Page ${page} / ${last}`;
    loading = false;
  }

  function onScroll() {
    if (!hasMore || loading) return;

    let top, height, client;
    if (el.sc === window) {
      const d = document.documentElement;
      top = window.scrollY || d.scrollTop;
      height = d.scrollHeight;
      client = window.innerHeight;
    } else {
      top = el.sc.scrollTop;
      height = el.sc.scrollHeight;
      client = el.sc.clientHeight;
    }

    if (top + client >= height - OFFSET) load(page + 1);
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (el.title) el.title.textContent = name || "Genre";
    hide(el.prev, el.next, el.info);

    load(1);

    const opt = { passive: true };
    (el.sc === window ? window : el.sc).addEventListener("scroll", onScroll, opt);
  });
})();
