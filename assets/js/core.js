(() => {
  "use strict";

  /* ========= CONST ========= */
  const BASE = "https://www.sankavollerei.com",
    // ✅ Gateway dramabox (baru)
    DRAMA_BASE = "https://api.ryhar.my.id/api/internet/dramabox",
    LS_FAV = "anikuy_favorites",
    LS_DRAMA_FAV = "anikuy_drama_favorites",
    LS_THEME = "anikuy_theme",
    // ✅ simpan apikey drama
    LS_DRAMA_KEY = "dramabox_apikey",
    LS_MODE = "anikuy_mode",
    MODE_DRAMA = "drama",
    MODE_ANIME = "anime",
    DARK = "dark",
    LIGHT = "light";

  const $ = (q) => document.getElementById(q);
  const $$ = (q) => document.querySelectorAll(q);

  const isDramaRoute = () =>
    document.body?.dataset?.page === "drama" || (location.pathname || "").startsWith("/drama");

  // mode untuk halaman netral (my-list / profile / settings)
  const getAppMode = () => {
    const p = location.pathname || "";
    const routeDrama = p.startsWith("/drama");

    // anime pages (eksplisit)
    const routeAnime =
      p === "/" ||
      p.startsWith("/anime") ||
      p.startsWith("/search") ||
      p.startsWith("/explore") ||
      p.startsWith("/anime/");

    // halaman netral: jangan override mode
    const neutral = p.startsWith("/my-list") || p.startsWith("/profile") || p.startsWith("/settings");

    try {
      if (routeDrama) localStorage.setItem(LS_MODE, MODE_DRAMA);
      else if (routeAnime) localStorage.setItem(LS_MODE, MODE_ANIME);
    } catch {}

    if (routeDrama) return MODE_DRAMA;
    if (routeAnime) return MODE_ANIME;

    // netral / lainnya: pakai mode terakhir
    try {
      return localStorage.getItem(LS_MODE) === MODE_DRAMA ? MODE_DRAMA : MODE_ANIME;
    } catch {
      return MODE_ANIME;
    }
  };

  // expose untuk script lain
  window.getAppMode = getAppMode;
  window.isDramaMode = () => getAppMode() === MODE_DRAMA;

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

    const txt = (t) => (t === LIGHT ? "Putih & Hitam" : "Biru & Hitam (Default)");
    label && (label.textContent = txt(current));

    const hide = () => sheet?.classList.remove("show");

    toggle?.addEventListener("click", () => sheet.classList.toggle("show"));
    close?.addEventListener("click", hide);
    overlay?.addEventListener("click", hide);

    radios.forEach((r) => {
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

  /* ========= FETCH HELPERS (anti CORS / timeout) ========= */
  const fetchJsonTry = async (url, timeoutMs = 12000) => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);

    try {
      const r = await fetch(url, {
        method: "GET",
        mode: "cors",
        credentials: "omit",
        cache: "no-store",
        headers: { Accept: "application/json,text/plain,*/*" },
        signal: ctrl.signal,
      });

      if (!r.ok) throw new Error(`HTTP_${r.status}`);

      const text = await r.text();
      try {
        return JSON.parse(text);
      } catch {
        throw new Error("INVALID_JSON");
      }
    } finally {
      clearTimeout(t);
    }
  };

  const fetchJsonWithFallback = async (realUrl) => {
    const tries = [
      realUrl,
      `https://corsproxy.io/?${encodeURIComponent(realUrl)}`,
      `https://api.allorigins.win/raw?url=${encodeURIComponent(realUrl)}`,
      `https://cors.isomorphic-git.org/${realUrl}`,
    ];

    let lastErr = null;
    for (const u of tries) {
      try {
        return await fetchJsonTry(u);
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr || new Error("FETCH_FAILED");
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

  /* ========= DRAMA APIKEY + PATH MAPPER ========= */
  // ✅ set apikey dari console / halaman settings
  window.setDramaApiKey = (k) => {
    try {
      localStorage.setItem(LS_DRAMA_KEY, String(k || "").trim());
      showToast("API key drama disimpan");
    } catch {}
  };

  const getDramaApiKey = () => {
    // prioritas: window.DRAMA_APIKEY -> localStorage -> default
    const k =
      (window.DRAMA_APIKEY && String(window.DRAMA_APIKEY).trim()) ||
      (localStorage.getItem(LS_DRAMA_KEY) || "").trim() ||
      "RyAPIs"; // ✅ default baru
    return k;
  };

  const mapDramaPath = (path) => {
    const p = String(path || "");
    // support pemanggilan lama: "/api/dramabox/latest" -> "/latest"
    if (p.startsWith("/api/dramabox/")) return p.replace("/api/dramabox", "");
    return p.startsWith("/") ? p : `/${p}`;
  };

  const withApiKey = (url) => {
    const key = getDramaApiKey();
    const join = url.includes("?") ? "&" : "?";
    return `${url}${join}apikey=${encodeURIComponent(key)}`;
  };

  // ✅ DRAMA API + fallback proxy anti CORS
  const apiGetDramaStable = async (path) => {
    try {
      const url = withApiKey(DRAMA_BASE + mapDramaPath(path));
      return await fetchJsonWithFallback(url);
    } catch (e) {
      console.error(e);
      // ✅ di route drama: jangan kasih toast (biar retry aja)
      if (!isDramaRoute()) showToast("Gagal memuat drama");
      throw e;
    }
  };

  // kunci biar nggak ketimpa script lain
  try {
    Object.defineProperty(window, "apiGetDrama", {
      value: apiGetDramaStable,
      writable: false,
      configurable: false,
    });
  } catch {
    window.apiGetDrama = apiGetDramaStable;
  }

  /* ========= FAVORITES ========= */
  let favs = (() => {
    try {
      return JSON.parse(localStorage.getItem(LS_FAV)) || [];
    } catch {
      return [];
    }
  })();

  const saveFav = () => localStorage.setItem(LS_FAV, JSON.stringify(favs));

  window.getFavorites = () => [...favs];
  window.isFavorite = (s) => favs.some((a) => a.slug === s);

  window.addFavorite = (a) => {
    if (!a?.slug || isFavorite(a.slug)) return;
    favs.push({
      slug: a.slug,
      title: a.title || "",
      poster: a.poster || "",
      rating: a.rating || "",
      episode_count: a.episode_count || "",
      status: a.status || "",
    });
    saveFav();
    showToast("Ditambahkan ke My List");
  };

  window.removeFavorite = (slug) => {
    favs = favs.filter((a) => a.slug !== slug);
    saveFav();
    showToast("Dihapus dari My List");
  };

  /* ========= DRAMA FAVORITES ========= */
  let dramaFavs = (() => {
    try {
      return JSON.parse(localStorage.getItem(LS_DRAMA_FAV)) || [];
    } catch {
      return [];
    }
  })();

  const saveDramaFav = () => localStorage.setItem(LS_DRAMA_FAV, JSON.stringify(dramaFavs));

  window.getDramaFavorites = () => [...dramaFavs];
  window.isDramaFavorite = (bookId) =>
    dramaFavs.some((b) => String(b?.bookId || "") === String(bookId || ""));

  window.addDramaFavorite = (b) => {
    const id = b?.bookId != null ? String(b.bookId) : "";
    if (!id || window.isDramaFavorite(id)) return;

    const tags = Array.isArray(b?.tags) ? b.tags : [];
    dramaFavs.push({
      bookId: id,
      bookName: b.bookName || b.title || "",
      coverWap: b.coverWap || b.poster || b.cover || "",
      cover: b.cover || "",
      chapterCount: b.chapterCount != null ? String(b.chapterCount) : b.episode_count || "",
      tags,
    });
    saveDramaFav();
    showToast("Ditambahkan ke My List");
  };

  window.removeDramaFavorite = (bookId) => {
    const id = bookId != null ? String(bookId) : "";
    dramaFavs = dramaFavs.filter((b) => String(b?.bookId || "") !== id);
    saveDramaFav();
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
      try {
        typeof o.onClick === "function" && o.onClick(item);
      } catch {}

      if (o.href) {
        location.href = o.href;
        return;
      }

      const s = means(item);
      if (s) location.href = `/anime/detail?slug=${encodeURIComponent(s)}`;
    };

    return c;
  };

  /* ========= DRAWER (bind markup existing) ========= */
  function closeDrawer() {
    const d = $("sideDrawer");
    const o = $("drawerOverlay");
    if (!d || !o) return;

    d.classList.remove("show");
    d.setAttribute("aria-hidden", "true");
    o.classList.remove("show");

    document.documentElement.classList.remove("drawer-open");
    document.body.classList.remove("drawer-open");

    setTimeout(() => (o.hidden = true), 170);
  }

  function bindExistingDrawerOnce() {
    const drawer = $("sideDrawer");
    const overlay = $("drawerOverlay");
    if (!drawer || !overlay) return;

    if (drawer.dataset.bound === "1") return;
    drawer.dataset.bound = "1";

    overlay.addEventListener("click", closeDrawer);
    $("drawerClose")?.addEventListener("click", closeDrawer);
    drawer.addEventListener("click", (e) => e.stopPropagation());

    drawer.querySelectorAll('a[href^="/"]').forEach((a) => {
      a.addEventListener("click", () => closeDrawer());
    });
  }

  function openDrawer() {
    bindExistingDrawerOnce();

    const d = $("sideDrawer");
    const o = $("drawerOverlay");
    if (!d || !o) return;

    d.classList.add("show");
    d.setAttribute("aria-hidden", "false");

    o.hidden = false;
    o.classList.add("show");

    document.documentElement.classList.add("drawer-open");
    document.body.classList.add("drawer-open");
  }

  window.openSideDrawer = openDrawer;
  window.closeSideDrawer = closeDrawer;

  /* ========= LEFT BUTTON MODE ========= */
  const ICON_BACK = `
    <svg class="icon-svg" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
    </svg>
  `;

  const ICON_HAMBURGER = `
    <svg class="icon-svg" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M3 6h18v2H3V6zm0 5h18v2H3v-2zm0 5h18v2H3v-2z"/>
    </svg>
  `;

  const setLeftButtonMode = (page) => {
    const back = $("backButton");
    if (!back) return;

    const isHamburger = page === "home" || page === "drama";

    if (isHamburger) {
      back.setAttribute("aria-label", "Menu");
      back.innerHTML = ICON_HAMBURGER;

      back.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        openDrawer();
      };
      return;
    }

    back.setAttribute("aria-label", "Kembali");
    back.innerHTML = ICON_BACK;

    back.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (back.dataset.href) location.href = back.dataset.href;
      else if (history.length > 1) history.back();
      else location.href = "/";
    };
  };

  /* ========= GLOBAL UI ========= */
  document.addEventListener("DOMContentLoaded", () => {
    bindTheme(initTheme());

    const page = document.body?.dataset?.page || "";
    const dramaPage = getAppMode() === MODE_DRAMA;

    $(".logo-wrap")?.addEventListener("click", () => (location.href = dramaPage ? "/drama" : "/"));

    $("searchButton")?.addEventListener("click", () => {
      location.href = dramaPage ? "/drama/search" : "/search";
    });

    $("settingsButton")?.addEventListener("click", () => (location.href = "/settings"));

    setLeftButtonMode(page);

    // ✅ Bottom nav: sinkronkan mode
    const homeNav =
      document.querySelector('.bottom-nav a[data-tab="home"]') ||
      document.querySelector('.bottom-nav a.nav-item[href="/"]') ||
      document.querySelector(".bottom-nav a.nav-item");
    if (homeNav) homeNav.setAttribute("href", dramaPage ? "/drama" : "/");

    const exploreNav = document.querySelector('.bottom-nav a.nav-item[href="/explore"]');
    if (exploreNav) exploreNav.setAttribute("href", dramaPage ? "/drama/explore" : "/explore");

    // hide bottom-nav saat scroll
    const main = $("mainContent"),
      nav = document.querySelector(".bottom-nav");

    if (main && nav) {
      let y = 0;
      main.addEventListener(
        "scroll",
        () => {
          const c = main.scrollTop;
          nav.classList.toggle("hide", c > y + 10);
          y = c;
        },
        { passive: true }
      );
    }

    // proteksi
    document.oncontextmenu = (e) => e.preventDefault();
    document.ondragstart = (e) => e.preventDefault();
    document.onkeydown = (e) => {
      const k = (e.key || "").toLowerCase();
      if (
        (e.ctrlKey && ["s", "u", "p"].includes(k)) ||
        (e.ctrlKey && e.shiftKey && ["i", "j", "c"].includes(k)) ||
        k === "f12"
      ) {
        e.preventDefault();
      }
    };
  });
})();
