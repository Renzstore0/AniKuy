// assets/js/core.js

const BASE_URL = "https://www.sankavollerei.com";
const LS_KEY_FAVORITES = "anikuy_favorites";
const LS_KEY_THEME = "anikuy_theme";
const THEME_DARK = "dark";
const THEME_LIGHT = "light";

function applyTheme(theme) {
  const body = document.body;
  if (!body) return;
  body.classList.remove("theme-dark", "theme-light");
  const t = theme === THEME_LIGHT ? THEME_LIGHT : THEME_DARK;
  body.classList.add(t === THEME_LIGHT ? "theme-light" : "theme-dark");
}

function initThemeFromStorage() {
  try {
    const saved = localStorage.getItem(LS_KEY_THEME);
    const theme = saved === THEME_LIGHT ? THEME_LIGHT : THEME_DARK;
    applyTheme(theme);
    return theme;
  } catch (e) {
    applyTheme(THEME_DARK);
    return THEME_DARK;
  }
}

function bindThemeControls(currentTheme) {
  const radios = document.querySelectorAll('input[name="theme-option"]');
  const themeCard = document.getElementById("themeCard");
  const themeToggle = document.getElementById("themeToggle");
  const themeList = document.getElementById("themeList");
  const currentLabelEl = document.getElementById("currentThemeLabel");

  function labelText(theme) {
    return theme === THEME_LIGHT
      ? "Putih & Hitam"
      : "Biru & Hitam (Default)";
  }

  function updateCurrentLabel(theme) {
    if (currentLabelEl) {
      currentLabelEl.textContent = labelText(theme);
    }
  }

  updateCurrentLabel(currentTheme);

  if (themeToggle && themeCard && themeList) {
    themeToggle.addEventListener("click", () => {
      const isOpen = themeCard.classList.toggle("open");
      themeToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });
  }

  if (!radios.length) return;

  radios.forEach((radio) => {
    radio.checked = radio.value === currentTheme;
    radio.addEventListener("change", (e) => {
      const value = e.target.value === THEME_LIGHT ? THEME_LIGHT : THEME_DARK;
      localStorage.setItem(LS_KEY_THEME, value);
      applyTheme(value);
      updateCurrentLabel(value);
      if (typeof showToast === "function") {
        showToast("Tema berhasil diubah");
      }
    });
  });
}

// TOAST
function showToast(msg) {
  const toastEl = document.getElementById("toast");
  if (!toastEl) return;
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  setTimeout(() => {
    toastEl.classList.remove("show");
  }, 1600);
}

// FETCH API SANKA
async function apiGet(path) {
  try {
    const res = await fetch(`${BASE_URL}${path}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error(err);
    showToast("Gagal memuat data");
    throw err;
  }
}

// FAVORITES (My List)
function loadFavoritesFromStorage() {
  try {
    const raw = localStorage.getItem(LS_KEY_FAVORITES);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

let favorites = loadFavoritesFromStorage();

function saveFavorites() {
  try {
    localStorage.setItem(LS_KEY_FAVORITES, JSON.stringify(favorites || []));
  } catch {
    // abaikan
  }
}

function getFavorites() {
  return Array.isArray(favorites) ? favorites.slice() : [];
}

function isFavorite(slug) {
  if (!slug) return false;
  return getFavorites().some((a) => a.slug === slug);
}

function addFavorite(anime) {
  if (!anime || !anime.slug) return;
  if (isFavorite(anime.slug)) return;

  const fav = {
    slug: anime.slug,
    title: anime.title || "",
    poster: anime.poster || "",
    rating: anime.rating || "",
    episode_count: anime.episode_count || "",
    status: anime.status || "",
  };

  favorites.push(fav);
  saveFavorites();

  if (typeof showToast === "function") {
    showToast("Ditambahkan ke My List");
  }
}

function removeFavorite(slug) {
  if (!slug) return;
  favorites = getFavorites().filter((a) => a.slug !== slug);
  saveFavorites();

  if (typeof showToast === "function") {
    showToast("Dihapus dari My List");
  }
}

// BIKIN KARTU ANIME (dipakai di semua page)
function createAnimeCard(item, opts = {}) {
  const card = document.createElement("div");
  card.className = "anime-card";

  const thumb = document.createElement("div");
  thumb.className = "anime-thumb";

  const img = document.createElement("img");
  img.src = item.poster;
  img.alt = item.title;
  thumb.appendChild(img);

  if (opts.badgeTop) {
    const b = document.createElement("div");
    b.className = "badge-top-left";
    b.textContent = opts.badgeTop;
    thumb.appendChild(b);
  }

  if (opts.badgeBottom) {
    const b = document.createElement("div");
    b.className = "badge-bottom-left";
    b.textContent = opts.badgeBottom;
    thumb.appendChild(b);
  }

  if (opts.rating) {
    const rate = document.createElement("div");
    rate.className = "badge-rating";
    const star = document.createElement("span");
    star.className = "star";
    star.textContent = "★";
    const val = document.createElement("span");
    val.textContent = opts.rating;
    rate.appendChild(star);
    rate.appendChild(val);
    thumb.appendChild(rate);
  }

  card.appendChild(thumb);

  const title = document.createElement("div");
  title.className = "anime-title";
  title.textContent = item.title;
  card.appendChild(title);

  if (opts.meta) {
    const m = document.createElement("div");
    m.className = "anime-meta";
    m.textContent = opts.meta;
    card.appendChild(m);
  }

  card.addEventListener("click", () => {
    if (!item.slug) return;
    const url = `/anime/detail?slug=${encodeURIComponent(item.slug)}`;
    window.location.href = url;
  });

  return card;
}

// GLOBAL UI
document.addEventListener("DOMContentLoaded", () => {
  const currentTheme = initThemeFromStorage();
  bindThemeControls(currentTheme);

  const backButton = document.getElementById("backButton");
  const searchButton = document.getElementById("searchButton");
  const pageType = document.body.dataset.page || "";
  const basePages = new Set(["home", "explore", "my-list", "profile"]);

  if (backButton) {
    backButton.style.visibility = basePages.has(pageType)
      ? "hidden"
      : "visible";

    backButton.addEventListener("click", () => {
      const customHref = backButton.dataset.href;
      if (customHref) {
        window.location.href = customHref;
      } else {
        window.history.back();
      }
    });
  }

  if (searchButton) {
    searchButton.addEventListener("click", () => {
      window.location.href = "/search";
    });
  }

  const mainContent = document.getElementById("mainContent");
  const bottomNav = document.querySelector(".bottom-nav");
  if (mainContent && bottomNav) {
    let lastScrollY = 0;
    let navHidden = false;

    mainContent.addEventListener("scroll", () => {
      const current = mainContent.scrollTop;

      if (current > lastScrollY + 10 && !navHidden) {
        bottomNav.classList.add("hide");
        navHidden = true;
      } else if (current < lastScrollY - 10 && navHidden) {
        bottomNav.classList.remove("hide");
        navHidden = false;
      }

      lastScrollY = current;
    });
  }

  document.addEventListener("contextmenu", (e) => {
    e.preventDefault();
  });
  document.addEventListener("dragstart", (e) => {
    e.preventDefault();
  });
  document.addEventListener("keydown", (e) => {
    const key = e.key.toLowerCase();
    if (
      (e.ctrlKey && ["s", "u", "p"].includes(key)) ||
      (e.ctrlKey && e.shiftKey && ["i", "j", "c"].includes(key)) ||
      key === "f12"
    ) {
      e.preventDefault();
    }
  });
});
