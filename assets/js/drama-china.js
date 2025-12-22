const API_BASE = "/api/dramabox";

const el = (id) => document.getElementById(id);

function toWatch(bookId) {
  location.href = `/drama-china/watch.html?bookId=${encodeURIComponent(bookId)}`;
}

function pickCover(item) {
  return item.coverWap || item.cover || "";
}

function makeCard(item) {
  const card = document.createElement("div");
  card.className = "anime-card";
  card.innerHTML = `
    <div class="anime-thumb">
      <img loading="lazy" src="${pickCover(item)}" alt="${item.bookName || "Drama"}" />
      ${item.chapterCount ? `<div class="badge-bottom-left">EP ${item.chapterCount}</div>` : ""}
      ${item.corner?.name ? `<div class="badge-top-left">${item.corner.name}</div>` : ""}
    </div>
    <div class="anime-title">${item.bookName || "-"}</div>
    <div class="anime-meta">${(item.tags && item.tags.slice(0,2).join(", ")) || ""}</div>
  `;
  card.addEventListener("click", () => toWatch(item.bookId));
  return card;
}

async function fetchJSON(path) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(path, { cache: "no-store", signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  } finally {
    clearTimeout(t);
  }
}

function initBack() {
  const b = el("backButton");
  if (!b) return;
  b.addEventListener("click", () => history.length > 1 ? history.back() : (location.href = "/"));
}

/* HERO (Trending) */
function initHero(list) {
  const heroSection = el("heroSection");
  if (!heroSection || !Array.isArray(list) || list.length === 0) return;

  const prevImg = el("heroPosterPrev");
  const mainImg = el("heroPoster");
  const nextImg = el("heroPosterNext");
  const nameEl = el("heroBookName");
  const dotsEl = el("heroDots");

  let i = 0;

  const render = () => {
    const cur = list[i];
    const prev = list[(i - 1 + list.length) % list.length];
    const next = list[(i + 1) % list.length];

    prevImg.src = pickCover(prev);
    mainImg.src = pickCover(cur);
    nextImg.src = pickCover(next);
    nameEl.textContent = cur.bookName || "";

    dotsEl.innerHTML = "";
    list.forEach((_, idx) => {
      const d = document.createElement("span");
      if (idx === i) d.classList.add("active");
      d.addEventListener("click", () => { i = idx; render(); });
      dotsEl.appendChild(d);
    });

    el("heroWatchBtn").onclick = () => toWatch(cur.bookId);
  };

  el("heroPrev").onclick = () => { i = (i - 1 + list.length) % list.length; render(); };
  el("heroNext").onclick = () => { i = (i + 1) % list.length; render(); };

  heroSection.style.display = "";
  render();
}

/* SEARCH */
function initSearch() {
  const toggle = el("searchToggle");
  const form = el("searchForm");
  const input = el("searchInput");
  const grid = el("searchGrid");
  const header = el("searchHeader");

  if (!toggle || !form || !input || !grid || !header) return;

  toggle.addEventListener("click", () => {
    const show = form.style.display === "none";
    form.style.display = show ? "" : "none";
    if (show) setTimeout(() => input.focus(), 0);
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const q = input.value.trim();
    if (!q) return;

    header.style.display = "";
    grid.style.display = "";
    grid.innerHTML = "";

    try {
      const data = await fetchJSON(`${API_BASE}/search?query=${encodeURIComponent(q)}`);
      (data || []).forEach((it) => grid.appendChild(makeCard(it)));
    } catch (err) {
      grid.innerHTML = `<div class="profile-text">Gagal cari. (${err.message})</div>`;
    }
  });
}

async function init() {
  initBack();
  initSearch();

  const forYouGrid = el("forYouGrid");
  const latestRow = el("latestRow");

  try {
    const [forYou, latest, trending] = await Promise.all([
      fetchJSON(`${API_BASE}/foryou`),
      fetchJSON(`${API_BASE}/latest`),
      fetchJSON(`${API_BASE}/trending`),
    ]);

    initHero(trending || []);

    forYouGrid.innerHTML = "";
    latestRow.innerHTML = "";

    (forYou || []).forEach((it) => forYouGrid.appendChild(makeCard(it)));
    (latest || []).forEach((it) => latestRow.appendChild(makeCard(it)));
  } catch (err) {
    forYouGrid.innerHTML = `<div class="profile-text">Gagal load data. (${err.message})</div>`;
  }
}

init();
