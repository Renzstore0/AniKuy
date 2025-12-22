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

  // ✅ update: bisa override href + callback onClick (biar bisa dipakai drama)
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
  const injectExtraCss = () => {
    // auto load CSS drawer supaya kamu ga perlu ubah style.css
    const href = "/assets/css/drawer.css";
    if (document.querySelector(`link[rel="stylesheet"][href="${href}"]`)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
  };

  const ensureDrawer = () => {
    if ($("sideDrawer")) return;

    const wrap = document.createElement("div");
    wrap.id = "sideDrawer";
    wrap.className = "side-drawer";
    wrap.setAttribute("aria-hidden", "true");

    wrap.innerHTML = `
      <div class="drawer-overlay" id="drawerOverlay"></div>
      <div class="drawer-panel" role="dialog" aria-modal="true" aria-label="Menu">
        <div class="drawer-brand">
          <img class="drawer-logo" src="https://pomf2.lain.la/f/22yuvdrk.png" alt="AniKuy">
          <div class="drawer-brand-text">
            <div class="drawer-title">AniKuy</div>
            <div class="drawer-subtitle">Pilih kategori</div>
          </div>
        </div>

        <div class="drawer-items">
          <button class="drawer-item" type="button" data-href="/">
            <span class="drawer-dot"></span>
            <span>Anime</span>
          </button>
          <button class="drawer-item" type="button" data-href="/drama">
            <span class="drawer-dot"></span>
            <span>Drama China</span>
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(wrap);

    const overlay = $("drawerOverlay");
    overlay?.addEventListener("click", () => closeDrawer());

    wrap.querySelectorAll(".drawer-item").forEach((btn) => {
      btn.addEventListener("click", () => {
        const href = btn.getAttribute("data-href") || "/";
        closeDrawer();
        location.href = href;
      });
    });

    // highlight active
    const path = (location.pathname || "/").replace(/\/+$/, "") || "/";
    const isDrama = path.startsWith("/drama");
    wrap.querySelectorAll(".drawer-item").forEach((btn) => {
      const href = btn.getAttribute("data-href");
      const active = href === "/drama" ? isDrama : !isDrama;
      btn.classList.toggle("active", !!active);
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeDrawer();
    });
  };

  const openDrawer = () => {
    ensureDrawer();
    const d = $("sideDrawer");
    if (!d) return;
    d.classList.add("show");
    d.setAttribute("aria-hidden", "false");
  };

  const closeDrawer = () => {
    const d = $("sideDrawer");
    if (!d) return;
    d.classList.remove("show");
    d.setAttribute("aria-hidden", "true");
  };

  window.openSideDrawer = openDrawer;
  window.closeSideDrawer = closeDrawer;

  const setLeftButtonMode = (page) => {
    const back = $("backButton");
    if (!back) return;

    // simpan icon asli agar bisa balik lagi
    if (!back.dataset.origHtml) back.dataset.origHtml = back.innerHTML;

    const rootPages = new Set(["home", "explore", "my-list", "profile", "drama"]);
    const isRoot = rootPages.has(page);

    back.style.visibility = "visible";

    if (isRoot) {
      // jadi hamburger
      back.setAttribute("aria-label", "Menu");
      back.classList.add("menu-as-hamburger");
      back.innerHTML = `
        <svg class="icon-svg" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="currentColor" d="M3 6h18v2H3V6zm0 5h18v2H3v-2zm0 5h18v2H3v-2z"/>
        </svg>
      `;
      back.onclick = () => openDrawer();
    } else {
      // balik jadi tombol back
      back.setAttribute("aria-label", "Kembali");
      back.classList.remove("menu-as-hamburger");
      back.innerHTML = back.dataset.origHtml;

      back.onclick = () => (back.dataset.href ? (location.href = back.dataset.href) : history.back());
    }
  };

  /* ========= GLOBAL UI ========= */
  document.addEventListener("DOMContentLoaded", () => {
    injectExtraCss();
    bindTheme(initTheme());

    const page = document.body.dataset.page || "";
    const isDramaPage = page.startsWith("drama") || (location.pathname || "").startsWith("/drama");

    $(".logo-wrap")?.addEventListener("click", () => (location.href = "/"));

    // ✅ search button: otomatis beda route untuk drama
    $("searchButton")?.addEventListener("click", () => {
      location.href = isDramaPage ? "/drama/search" : "/search";
    });

    $("settingsButton")?.addEventListener("click", () => (location.href = "/settings"));

    // ✅ left button: root = hamburger, selain root = back
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
      const k = e.key.toLowerCase();
      if (
        (e.ctrlKey && ["s", "u", "p"].includes(k)) ||
        (e.ctrlKey && e.shiftKey && ["i", "j", "c"].includes(k)) ||
        k === "f12"
      )
        e.preventDefault();
    };
  });
})();
