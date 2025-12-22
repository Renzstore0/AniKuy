// assets/js/core.js
(() => {
  "use strict";

  /* ========= CONST ========= */
  const BASE = "https://www.sankavollerei.com",
        LS_FAV = "anikuy_favorites",
        LS_THEME = "anikuy_theme",
        DARK = "dark",
        LIGHT = "light";

  const $ = (q) => document.getElementById(q);
  const $$ = (q) => document.querySelectorAll(q);

  /* ========= TOAST ========= */
  window.showToast = (msg) => {
    const t = $("toast");
    if (!t) return;
    t.textContent = msg;
    t.classList.add("show");
    setTimeout(() => t.classList.remove("show"), 1600);
  };

  /* ========= THEME ========= */
  const applyTheme = (t) => {
    document.body.classList.remove("theme-dark", "theme-light");
    document.body.classList.add(t === LIGHT ? "theme-light" : "theme-dark");
  };

  const initTheme = () => {
    const t = localStorage.getItem(LS_THEME) === LIGHT ? LIGHT : DARK;
    applyTheme(t);
    return t;
  };

  const bindTheme = (current) => {
    const sheet = $("themeSheet"),
          toggle = $("themeToggle"),
          label = $("currentThemeLabel"),
          close = $("themeSheetClose"),
          overlay = $("themeSheetOverlay"),
          radios = $$('input[name="theme-option"]');

    const txt = (t) => t === LIGHT ? "Putih & Hitam" : "Biru & Hitam (Default)";
    label && (label.textContent = txt(current));

    const hide = () => sheet?.classList.remove("show");

    toggle?.addEventListener("click", () => sheet?.classList.toggle("show"));
    close?.addEventListener("click", hide);
    overlay?.addEventListener("click", hide);

    radios.forEach(r => {
      r.checked = r.value === current;
      r.onchange = () => {
        const v = r.value === LIGHT ? LIGHT : DARK;
        localStorage.setItem(LS_THEME, v);
        applyTheme(v);
        label && (label.textContent = txt(v));
        showToast("Tema berhasil diubah");
        hide();
      };
    });
  };

  /* ========= API ========= */
  window.apiGet = async (path) => {
    try {
      const r = await fetch(BASE + path);
      if (!r.ok) throw r.status;
      return await r.json();
    } catch (e) {
      console.error(e);
      showToast("Gagal memuat data");
      throw e;
    }
  };

  // coba beberapa endpoint, ambil yang sukses pertama
  window.apiGetTry = async (paths = []) => {
    for (const p of paths) {
      try {
        const j = await apiGet(p);
        if (j?.status === "success" || j?.ok === true) return j;
      } catch {}
    }
    return null;
  };

  /* ========= FAVORITES ========= */
  let favs = (() => {
    try { return JSON.parse(localStorage.getItem(LS_FAV)) || []; }
    catch { return []; }
  })();

  const saveFav = () => localStorage.setItem(LS_FAV, JSON.stringify(favs));

  window.getFavorites = () => [...favs];
  window.isFavorite = (s) => favs.some(a => a.slug === s);

  window.addFavorite = (a) => {
    if (!a?.slug || isFavorite(a.slug)) return;
    favs.push({
      slug: a.slug, title: a.title || "", poster: a.poster || "",
      rating: a.rating || "", episode_count: a.episode_count || "", status: a.status || ""
    });
    saveFav();
    showToast("Ditambahkan ke My List");
  };

  window.removeFavorite = (slug) => {
    favs = favs.filter(a => a.slug !== slug);
    saveFav();
    showToast("Dihapus dari My List");
  };

  /* ========= CARD ========= */
  const means = (o) => o.slug || o.animeId || o.id || o.anime_id || "";

  window.createAnimeCard = (item, o = {}) => {
    const c = document.createElement("div");
    c.className = "anime-card";
    c.innerHTML = `
      <div class="anime-thumb">
        <img src="${item.poster || "/assets/img/placeholder-poster.png"}" alt="${item.title || "Anime"}">
        ${o.badgeTop ? `<div class="badge-top-left">${o.badgeTop}</div>` : ""}
        ${o.badgeBottom ? `<div class="badge-bottom-left">${o.badgeBottom}</div>` : ""}
        ${o.rating ? `<div class="badge-rating"><span class="star">★</span><span>${o.rating}</span></div>` : ""}
      </div>
      <div class="anime-title">${item.title || "-"}</div>
      ${o.meta ? `<div class="anime-meta">${o.meta}</div>` : ""}
    `;
    c.onclick = () => {
      const s = means(item);
      s && (location.href = `/anime/detail?slug=${encodeURIComponent(s)}`);
    };
    return c;
  };

  /* ========= GLOBAL UI ========= */
  document.addEventListener("DOMContentLoaded", () => {
    bindTheme(initTheme());

    $(".logo-wrap")?.addEventListener("click", () => location.href = "/");
    $("searchButton")?.addEventListener("click", () => location.href = "/search");
    $("settingsButton")?.addEventListener("click", () => location.href = "/settings");

    const back = $("backButton"),
          page = document.body.dataset.page,
          root = new Set(["home","explore","my-list","profile"]);

    if (back) {
      back.style.visibility = root.has(page) ? "hidden" : "visible";
      back.onclick = () => back.dataset.href ? location.href = back.dataset.href : history.back();
    }

    const main = $("mainContent"),
          nav = document.querySelector(".bottom-nav");

    if (main && nav) {
      let y = 0;
      main.addEventListener("scroll", () => {
        const c = main.scrollTop;
        nav.classList.toggle("hide", c > y + 10);
        y = c;
      }, { passive:true });
    }

    document.oncontextmenu = e => e.preventDefault();
    document.ondragstart = e => e.preventDefault();
    document.onkeydown = e => {
      const k = e.key.toLowerCase();
      if (
        (e.ctrlKey && ["s","u","p"].includes(k)) ||
        (e.ctrlKey && e.shiftKey && ["i","j","c"].includes(k)) ||
        k === "f12"
      ) e.preventDefault();
    };
  });
})();
