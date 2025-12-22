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

  // ✅ DRAMA API (Dramabox)
  window.apiGetDrama = async (path) => {
    try {
      const r = await fetch(DRAMA_BASE + path);
      if (!r.ok) throw r.status;
      return await r.json();
    } catch (e) {
      console.error(e);
      showToast("Gagal memuat drama");
      throw e;
    }
  };

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

  // ✅ bisa override href + callback onClick (buat anime/drama)
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

  // CSS drawer (biar gak perlu file tambahan). Kalau kamu sudah punya di style.css, ini aman.
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

      .drawer-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px}
      .drawer-brand{display:flex;align-items:center;gap:10px}
      .drawer-logo{width:34px;height:34px;border-radius:12px;object-fit:contain;background:rgba(2,6,23,.35);padding:6px}
      .drawer-title{font-size:16px;font-weight:800;letter-spacing:.06em;color:#e5f0ff;line-height:1}
      .drawer-subtitle{font-size:12px;color:#94a3b8;margin-top:2px}

      .drawer-close{width:32px;height:32px;border-radius:999px;border:none;background:rgba(2,6,23,.35);color:#e5e7eb;
        display:flex;align-items:center;justify-content:center;cursor:pointer}
      .drawer-close:active{transform:scale(.96)}

      .drawer-items{display:flex;flex-direction:column;gap:10px;margin-top:8px}
      .drawer-item{width:100%;display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:14px;
        border:1px solid rgba(148,163,184,.18);background:rgba(2,6,23,.25);color:#e5e7eb;
        font-weight:700;letter-spacing:.04em;cursor:pointer;text-align:left}
      .drawer-item:hover{background:rgba(2,6,23,.38)}
      .drawer-item:active{transform:scale(.99)}
      .drawer-item.active{border-color:transparent;background:linear-gradient(135deg,#1d4ed8,#22d3ee);color:#e5f0ff}
      .drawer-dot{width:8px;height:8px;border-radius:999px;background:rgba(148,163,184,.7)}
      .drawer-item.active .drawer-dot{background:#fff}

      html.drawer-open,body.drawer-open{overflow:hidden}
    `;
    document.head.appendChild(style);
  };

  const highlightActiveDrawer = () => {
    const drawer = $("sideDrawer");
    if (!drawer) return;
    const path = (location.pathname || "/").replace(/\/+$/, "") || "/";
    const isDrama = path.startsWith("/drama");
    drawer.querySelectorAll(".drawer-item[data-href]").forEach((btn) => {
      const href = btn.getAttribute("data-href") || "/";
      const active = href.startsWith("/drama") ? isDrama : !isDrama;
      btn.classList.toggle("active", !!active);
    });
  };

  const ensureDrawer = () => {
    if ($("sideDrawer") && $("drawerOverlay")) {
      highlightActiveDrawer();
      return;
    }

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
      <div class="drawer-head">
        <div class="drawer-brand">
          <img class="drawer-logo" src="https://pomf2.lain.la/f/22yuvdrk.png" alt="AniKuy">
          <div>
            <div class="drawer-title">AniKuy</div>
            <div class="drawer-subtitle">Pilih kategori</div>
          </div>
        </div>

        <button class="drawer-close" id="drawerClose" type="button" aria-label="Tutup">
          <svg class="icon-svg" viewBox="0 0 24 24" aria-hidden="true" style="width:18px;height:18px">
            <path fill="currentColor" d="M18.3 5.71 12 12l6.3 6.29-1.41 1.42L10.59 13.4 4.29 19.71 2.88 18.29 9.17 12 2.88 5.71 4.29 4.29 10.59 10.6l6.3-6.31z"/>
          </svg>
        </button>
      </div>

      <div class="drawer-items">
        <button class="drawer-item" type="button" data-href="/">
          <span class="drawer-dot"></span>
          <span>Anime</span>
        </button>

        <button class="drawer-item" type="button" data-href="/drama/index.html">
          <span class="drawer-dot"></span>
          <span>Drama China</span>
        </button>
      </div>
    `;

    document.body.appendChild(overlay);
    document.body.appendChild(drawer);

    const closeBtn = $("drawerClose");

    overlay.addEventListener("click", () => closeDrawer());
    closeBtn?.addEventListener("click", () => closeDrawer());
    drawer.addEventListener("click", (e) => e.stopPropagation());

    drawer.querySelectorAll(".drawer-item[data-href]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const href = btn.getAttribute("data-href") || "/";
        closeDrawer();
        location.href = href;
      });
    });

    if (!document.documentElement.dataset.drawerEscBound) {
      document.documentElement.dataset.drawerEscBound = "1";
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") closeDrawer();
      });
    }

    highlightActiveDrawer();
  };

  const openDrawer = () => {
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
  };

  const closeDrawer = () => {
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
  };

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

    // selain home anime & home drama => tombol back
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

    // search button: beda route untuk drama
    $("searchButton")?.addEventListener("click", () => {
      location.href = isDramaPage ? "/drama/search" : "/search";
    });

    $("settingsButton")?.addEventListener("click", () => (location.href = "/settings"));

    // ✅ hamburger hanya di home anime & home drama
    setLeftButtonMode(page);

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
