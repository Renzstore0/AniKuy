(() => {
  "use strict";

  /* ========= CONST ========= */
  const BASE = "https://www.sankavollerei.com",
    DRAMA_BASE = "https://dramabox.sansekai.my.id",
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
        headers: {
          Accept: "application/json,text/plain,*/*",
        },
        signal: ctrl.signal,
      });

      if (!r.ok) throw new Error(`HTTP_${r.status}`);

      const text = await r.text();
      try {
        return JSON.parse(text);
      } catch {
        // kalau ada proxy yang wrap konten, coba handle minimal
        // tapi default: anggap ini bukan JSON valid
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

  // ✅ DRAMA API (Dramabox) + fallback proxy anti CORS
  const apiGetDramaStable = async (path) => {
    try {
      const url = DRAMA_BASE + path;
      return await fetchJsonWithFallback(url);
    } catch (e) {
      console.error(e);
      showToast("Gagal memuat drama");
      throw e;
    }
  };

  // kunci biar nggak ketimpa script lain (menu.js dll)
  if (!window.apiGetDrama) {
    Object.defineProperty(window, "apiGetDrama", {
      value: apiGetDramaStable,
      writable: false,
      configurable: false,
    });
  } else {
    // kalau sudah ada, timpa sekali lalu kunci
    try {
      Object.defineProperty(window, "apiGetDrama", {
        value: apiGetDramaStable,
        writable: false,
        configurable: false,
      });
    } catch {}
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

  /* ========= SIDEDRAWER (Hamburger Menu) ========= */

  const injectDrawerCss = () => {
    if (document.getElementById("anikuy-drawer-css")) return;
    const style = document.createElement("style");
    style.id = "anikuy-drawer-css";
    style.textContent = `
      .drawer-overlay{position:fixed;inset:0;background:rgba(2,6,23,.55);opacity:0;pointer-events:none;transition:opacity .16s ease;z-index:9998}
      .drawer-overlay.show{opacity:1;pointer-events:auto}

      .side-drawer{position:fixed;top:0;left:0;height:100dvh;width:min(320px,86vw);background:rgba(15,23,42,.98);
        border-right:1px solid rgba(30,64,175,.35);box-shadow:18px 0 45px rgba(0,0,0,.55);
        transform:translateX(-102%);transition:transform .16s ease;z-index:9999;padding:14px 14px 18px}
      .side-drawer.show{transform:translateX(0)}

      html.drawer-open,body.drawer-open{overflow:hidden}
    `;
    document.head.appendChild(style);
  };

  const highlightActiveDrawer = () => {
    const drawer = $("sideDrawer");
    if (!drawer) return;

    const path = (location.pathname || "/").replace(/\/+$/, "") || "/";
    const isDrama = path.startsWith("/drama");

    // mode inject (button .drawer-item)
    drawer.querySelectorAll(".drawer-item[data-href]").forEach((btn) => {
      const href = btn.getAttribute("data-href") || "/";
      const active = href.startsWith("/drama") ? isDrama : !isDrama;
      btn.classList.toggle("active", !!active);
    });

    // mode static (a.side-drawer-link)
    drawer.querySelectorAll("a.side-drawer-link[href]").forEach((a) => {
      const href = (a.getAttribute("href") || "/").replace(/\/+$/, "") || "/";
      const active = href.startsWith("/drama") ? isDrama : !isDrama;
      a.classList.toggle("active", !!active);
    });
  };

  function closeDrawer() {
    const d = $("sideDrawer");
    const o = $("drawerOverlay");
    if (!d || !o) return;

    d.classList.remove("show");
    d.setAttribute("aria-hidden", "true");

    o.classList.remove("show");

    document.documentElement.classList.remove("drawer-open");
    document.body.classList.remove("drawer-open");

    setTimeout(() => {
      o.hidden = true;
    }, 170);
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

    // kalau link di drawer diklik, tutup dulu
    drawer.querySelectorAll('a[href^="/"]').forEach((a) => {
      a.addEventListener("click", () => {
        closeDrawer();
      });
    });

    highlightActiveDrawer();
  }

  const ensureDrawer = () => {
    // kalau markup sudah ada (index.html / drama/index.html), cukup bind event-nya
    if ($("sideDrawer") && $("drawerOverlay")) {
      bindExistingDrawerOnce();
      return;
    }

    // kalau belum ada, inject model drawer (fallback)
    injectDrawerCss();

    const overlay = document.createElement("div");
    overlay.id = "drawerOverlay";
    overlay.className = "drawer-overlay";
    overlay.hidden = true;

    const drawer = document.createElement("aside");
    drawer.id = "sideDrawer";
    drawer.className = "side-drawer";
    drawer.setAttribute("aria-hidden", "true");

    drawer.innerHTML = `
      <div class="drawer-head" style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px">
        <div style="display:flex;align-items:center;gap:10px">
          <img class="drawer-logo" src="https://pomf2.lain.la/f/22yuvdrk.png" alt="AniKuy"
               style="width:34px;height:34px;border-radius:12px;object-fit:contain;background:rgba(2,6,23,.35);padding:6px">
          <div>
            <div style="font-size:16px;font-weight:800;letter-spacing:.06em;color:#e5f0ff;line-height:1">AniKuy</div>
            <div style="font-size:12px;color:#94a3b8;margin-top:2px">Pilih kategori</div>
          </div>
        </div>

        <button class="drawer-close" id="drawerClose" type="button" aria-label="Tutup"
                style="width:32px;height:32px;border-radius:999px;border:none;background:rgba(2,6,23,.35);color:#e5e7eb;display:flex;align-items:center;justify-content:center;cursor:pointer">
          ✕
        </button>
      </div>

      <div class="drawer-items" style="display:flex;flex-direction:column;gap:10px;margin-top:8px">
        <button class="drawer-item" type="button" data-href="/" style="width:100%;display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:14px;border:1px solid rgba(148,163,184,.18);background:rgba(2,6,23,.25);color:#e5e7eb;font-weight:700;letter-spacing:.04em;cursor:pointer;text-align:left">
          <span style="width:8px;height:8px;border-radius:999px;background:rgba(148,163,184,.7)"></span>
          <span>Anime</span>
        </button>

        <button class="drawer-item" type="button" data-href="/drama" style="width:100%;display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:14px;border:1px solid rgba(148,163,184,.18);background:rgba(2,6,23,.25);color:#e5e7eb;font-weight:700;letter-spacing:.04em;cursor:pointer;text-align:left">
          <span style="width:8px;height:8px;border-radius:999px;background:rgba(148,163,184,.7)"></span>
          <span>Drama China</span>
        </button>
      </div>
    `;

    document.body.appendChild(overlay);
    document.body.appendChild(drawer);

    bindExistingDrawerOnce();

    drawer.querySelectorAll(".drawer-item[data-href]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const href = btn.getAttribute("data-href") || "/";
        closeDrawer();
        location.href = href;
      });
    });
  };

  function openDrawer() {
    ensureDrawer();
    const d = $("sideDrawer");
    const o = $("drawerOverlay");
    if (!d || !o) return;

    highlightActiveDrawer();

    d.classList.add("show");
    d.setAttribute("aria-hidden", "false");

    o.hidden = false;
    o.classList.add("show");

    document.documentElement.classList.add("drawer-open");
    document.body.classList.add("drawer-open");
  }

  window.openSideDrawer = openDrawer;
  window.closeSideDrawer = closeDrawer;

  /* ========= LEFT BUTTON (HAMBURGER ONLY HOME ANIME & HOME DRAMA) ========= */
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
    const isDramaPage = page === "drama" || (location.pathname || "").startsWith("/drama");

    $(".logo-wrap")?.addEventListener("click", () => (location.href = "/"));

    $("searchButton")?.addEventListener("click", () => {
      location.href = isDramaPage ? "/drama/search" : "/search";
    });

    $("settingsButton")?.addEventListener("click", () => (location.href = "/settings"));

    setLeftButtonMode(page);

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
