const ongoingGridHome = document.getElementById("ongoingGridHome");
const completeRowHome = document.getElementById("completeRowHome");
const seeAllOngoingBtn = document.getElementById("seeAllOngoingBtn");
const seeAllCompleteBtn = document.getElementById("seeAllCompleteBtn");

// opsional: kalau ada judul section di HTML, biar bisa diganti jadi "Movie"
const completeSectionTitle = document.getElementById("completeSectionTitle");

// elemen "Rilis Hari Ini" (hero)
const todaySection = document.getElementById("todaySection");
const todayHeaderTitle = document.getElementById("todayHeaderTitle");
const todayPosterPrev = document.getElementById("todayPosterPrev");
const todayPoster = document.getElementById("todayPoster");
const todayPosterNext = document.getElementById("todayPosterNext");
const todayTitle = document.getElementById("todayTitle");
const todayDots = document.getElementById("todayDots");
const todayWatchBtn = document.getElementById("todayWatchBtn");
const todayPrevBtn = document.getElementById("todayPrevBtn");
const todayNextBtn = document.getElementById("todayNextBtn");

let todayAnimeList = [];
let todayIndex = 0;
let todayAutoTimer = null;
const TODAY_AUTO_MS = 7000;

// --- UTIL HARI ---
function getTodayNameIndo() {
  const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  return days[new Date().getDay()];
}

function getTodayNameEnglish() {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return days[new Date().getDay()];
}

function toIndoDay(day) {
  const map = {
    monday: "Senin",
    tuesday: "Selasa",
    wednesday: "Rabu",
    thursday: "Kamis",
    friday: "Jumat",
    saturday: "Sabtu",
    sunday: "Minggu",
  };
  if (!day) return "-";
  const key = String(day).trim().toLowerCase();
  return map[key] || day;
}

function parseAnimeIdFromHref(href) {
  if (!href) return "";
  try {
    const s = String(href).trim();
    const parts = s.split("/").filter(Boolean);
    return parts[parts.length - 1] || "";
  } catch {
    return "";
  }
}

function safePoster(url) {
  return url && String(url).trim() ? url : "/assets/img/placeholder-poster.png";
}

// --- FORMAT LABEL EPISODE ---
function formatEpisodeLabel(text) {
  if (!text && text !== 0) return "";
  let t = String(text).trim();

  let m = t.match(/^Total\s+(\d+)\s*(Episode|Eps?)?/i);
  if (m) return `Eps ${m[1]}`;

  m = t.match(/^Episode\s+(\d+)/i);
  if (m) return `Eps ${m[1]}`;

  m = t.match(/^(\d+)\s*(Episode|Eps?)?$/i);
  if (m) return `Eps ${m[1]}`;

  return t.replace(/Episode/gi, "Eps");
}

// --- RILIS HARI INI (HERO) ---
function scrollTodayDotsIntoView() {
  if (!todayDots) return;
  const active = todayDots.querySelector("span.active");
  if (!active) return;

  const wrapRect = todayDots.getBoundingClientRect();
  const dotRect = active.getBoundingClientRect();
  const offset =
    dotRect.left - wrapRect.left - wrapRect.width / 2 + dotRect.width / 2;

  todayDots.scrollBy({ left: offset, behavior: "smooth" });
}

function updateTodayHero() {
  if (!todaySection || !todayPoster || !todayTitle || !todayDots || !todayAnimeList.length) return;

  const current = todayAnimeList[todayIndex];
  if (!current) return;

  const len = todayAnimeList.length;
  const prevIndex = (todayIndex - 1 + len) % len;
  const nextIndex = (todayIndex + 1) % len;

  const prev = todayAnimeList[prevIndex];
  const next = todayAnimeList[nextIndex];

  todayPoster.src = safePoster(current.poster);
  todayPoster.alt = current.title || "";
  todayTitle.textContent = current.title || "-";

  if (todayPosterPrev && prev) {
    todayPosterPrev.src = safePoster(prev.poster);
    todayPosterPrev.alt = prev.title || "";
  }
  if (todayPosterNext && next) {
    todayPosterNext.src = safePoster(next.poster);
    todayPosterNext.alt = next.title || "";
  }

  todayDots.innerHTML = "";
  todayAnimeList.forEach((_, i) => {
    const dot = document.createElement("span");
    if (i === todayIndex) dot.classList.add("active");
    todayDots.appendChild(dot);
  });

  scrollTodayDotsIntoView();
}

function restartTodayAuto() {
  if (todayAutoTimer) clearInterval(todayAutoTimer);
  if (!todayAnimeList.length) return;

  todayAutoTimer = setInterval(() => {
    goTodayStep(1, false);
  }, TODAY_AUTO_MS);
}

function goToTodayDetail() {
  const current = todayAnimeList[todayIndex];
  if (!current || !current.slug) return;
  const url = `/anime/detail?slug=${encodeURIComponent(current.slug)}`;
  window.location.href = url;
}

function goTodayStep(delta, fromUser = true) {
  if (!todayAnimeList.length) return;
  const len = todayAnimeList.length;
  todayIndex = (todayIndex + delta + len) % len;
  updateTodayHero();
  if (fromUser) restartTodayAuto();
}

// ✅ UPDATE: pakai endpoint baru /anime/samehadaku/schedule
async function loadTodayAnime() {
  if (!todaySection) return;

  let json;
  try {
    json = await apiGet("/anime/samehadaku/schedule");
  } catch {
    // fallback kalau masih ada endpoint lama
    try {
      json = await apiGet("/anime/schedule");
    } catch {
      return;
    }
  }

  if (!json || json.status !== "success") return;

  const todayIndo = getTodayNameIndo();
  const todayEng = getTodayNameEnglish();

  // bentuk baru: json.data.days = [{ day: "Friday", animeList: [...] }]
  const daysNew =
    json.data && Array.isArray(json.data.days) ? json.data.days : null;

  // bentuk lama: json.data = [{ day: "Jumat", anime_list: [...] }]
  const daysOld = Array.isArray(json.data) ? json.data : null;

  let list = [];

  if (daysNew) {
    const obj =
      daysNew.find((d) => String(d.day || "").toLowerCase() === todayEng.toLowerCase()) ||
      daysNew.find((d) => toIndoDay(d.day) === todayIndo);

    const arr = obj && Array.isArray(obj.animeList) ? obj.animeList : [];
    list = arr.map((a) => ({
      title: a.title || "-",
      poster: a.poster || "",
      slug: a.animeId || parseAnimeIdFromHref(a.href) || "",
    }));
  } else if (daysOld) {
    const obj = daysOld.find((d) => String(d.day || "") === todayIndo);
    const arr = obj && Array.isArray(obj.anime_list) ? obj.anime_list : [];
    list = arr.map((a) => ({
      title: a.anime_name || "-",
      poster: a.poster || "",
      slug: a.slug || "",
    }));
  }

  todayAnimeList = list.filter((x) => x && x.slug);

  if (!todayAnimeList.length) {
    // kalau tidak ada rilis hari ini, sembunyikan
    todaySection.style.display = "none";
    return;
  }

  todaySection.style.display = "block";
  if (todayHeaderTitle) todayHeaderTitle.textContent = `Anime Rilis Hari Ini - ${todayIndo}`;

  todayIndex = 0;
  updateTodayHero();
  restartTodayAuto();

  if (todayWatchBtn) todayWatchBtn.addEventListener("click", () => goToTodayDetail());
  if (todayPoster) todayPoster.addEventListener("click", () => goToTodayDetail());

  if (todayPosterPrev) todayPosterPrev.addEventListener("click", () => goTodayStep(-1, true));
  if (todayPosterNext) todayPosterNext.addEventListener("click", () => goTodayStep(1, true));

  if (todayPrevBtn) todayPrevBtn.addEventListener("click", () => goTodayStep(-1, true));
  if (todayNextBtn) todayNextBtn.addEventListener("click", () => goTodayStep(1, true));
}

// --- HOME: RECENT + MOVIE (Samehadaku) ---
async function loadHome() {
  if (!ongoingGridHome || !completeRowHome) return;

  // ganti label "Selesai Tayang" -> "Movie" kalau elemennya ada
  if (completeSectionTitle) completeSectionTitle.textContent = "Movie";

  let homeJson;
  try {
    homeJson = await apiGet("/anime/samehadaku/home");
  } catch {
    return;
  }

  if (!homeJson || homeJson.status !== "success" || !homeJson.data) {
    if (typeof showToast === "function") showToast("Data home tidak valid");
    return;
  }

  // RECENT
  const recentList = (homeJson.data.recent && homeJson.data.recent.animeList) || [];

  ongoingGridHome.innerHTML = "";

  recentList.slice(0, 9).forEach((a) => {
    const item = {
      title: a.title || "-",
      poster: a.poster || "",
      slug: a.animeId || a.slug || "", // animeId = slug internal
      animeId: a.animeId,
    };

    const card = createAnimeCard(item, {
      badgeTop: "Baru",
      badgeBottom: formatEpisodeLabel(a.episodes || ""),
      meta: a.releasedOn || "",
    });

    ongoingGridHome.appendChild(card);
  });

  // ✅ MOVIES (ganti dari top10/selsai tayang)
  let movieJson;
  try {
    movieJson = await apiGet("/anime/samehadaku/movies");
  } catch {
    movieJson = null;
  }

  const movieList =
    movieJson && movieJson.status === "success" && movieJson.data
      ? movieJson.data.animeList || []
      : [];

  completeRowHome.innerHTML = "";

  movieList.slice(0, 15).forEach((a) => {
    const item = {
      title: a.title || "-",
      poster: a.poster || "",
      slug: a.animeId || parseAnimeIdFromHref(a.href) || "",
      animeId: a.animeId,
    };

    const card = createAnimeCard(item, {
      rating: a.score && a.score !== "" ? a.score : "N/A",
      meta: a.releaseDate ? a.releaseDate : (a.status || ""),
    });

    completeRowHome.appendChild(card);
  });
}

// --- BUTTON "SEMUA" ---
if (seeAllOngoingBtn) {
  seeAllOngoingBtn.addEventListener("click", () => {
    window.location.href = "/anime/ongoing";
  });
}

if (seeAllCompleteBtn) {
  seeAllCompleteBtn.addEventListener("click", () => {
    // ✅ ganti ke halaman list Movie
    window.location.href = "/anime/movies";
  });
}

// --- INIT ---
document.addEventListener("DOMContentLoaded", () => {
  loadHome();
  loadTodayAnime();
});
