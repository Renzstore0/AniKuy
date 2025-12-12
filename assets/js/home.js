// assets/js/home.js

// DOM targets
const ongoingGridHome = document.getElementById("ongoingGridHome");
const completeRowHome = document.getElementById("completeRowHome");
const todaySection = document.getElementById("todaySection");
const todayHeaderTitle = document.getElementById("todayHeaderTitle");
const todaySubTitle = document.getElementById("todaySubTitle");
const todayBigPoster = document.getElementById("todayBigPoster");
const todayBigTitle = document.getElementById("todayBigTitle");
const todayBigSubtitle = document.getElementById("todayBigSubtitle");
const todayBigBtn = document.getElementById("todayBigBtn");

// Buttons
const seeAllOngoingBtn = document.getElementById("seeAllOngoingBtn");
const seeAllCompleteBtn = document.getElementById("seeAllCompleteBtn");

let todayAnimeList = [];
let todayIndex = 0;

// ---------- UTIL ----------

function getTodayName() {
  // API schedule Samehadaku menggunakan nama hari dalam bahasa Inggris
  const daysEn = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const daysId = [
    "Minggu",
    "Senin",
    "Selasa",
    "Rabu",
    "Kamis",
    "Jumat",
    "Sabtu",
  ];

  const idx = new Date().getDay();
  return { en: daysEn[idx], id: daysId[idx] };
}

function pickRandom(list) {
  if (!Array.isArray(list) || list.length === 0) return null;
  const idx = Math.floor(Math.random() * list.length);
  return list[idx];
}

// ---------- TODAY SECTION ----------

async function loadTodayAnime() {
  if (!todaySection) return;

  let json;
  try {
    json = await apiGet("/anime/samehadaku/schedule");
  } catch {
    return;
  }

  const days = json && json.data && Array.isArray(json.data.days) ? json.data.days : [];
  if (!json || json.status !== "success" || !Array.isArray(days)) return;

  const todayName = getTodayName();

  const todayObj = days.find(
    (d) => String(d.day || "").toLowerCase() === String(todayName.en).toLowerCase()
  );

  if (!todayObj || !Array.isArray(todayObj.animeList)) {
    // Tidak ada jadwal untuk hari ini
    todaySection.style.display = "none";
    return;
  }

  todayAnimeList = todayObj.animeList.map((a) => ({
    title: a.title,
    poster: a.poster,
    slug: a.animeId, // mapping untuk detail page
    type: a.type,
    score: a.score,
    estimation: a.estimation,
    genres: a.genres,
  }));

  // Set header
  if (todayHeaderTitle) todayHeaderTitle.textContent = `Anime Rilis Hari Ini - ${todayName.id}`;

  // Pilih anime pertama (random)
  const current = pickRandom(todayAnimeList);
  if (!current) return;

  todayIndex = todayAnimeList.findIndex((x) => x.slug === current.slug);
  renderTodayBig(current);
}

function renderTodayBig(anime) {
  if (!anime) return;

  if (todayBigPoster) todayBigPoster.src = anime.poster || "/assets/img/placeholder-poster.png";
  if (todayBigTitle) todayBigTitle.textContent = anime.title || "-";

  const parts = [];
  if (anime.type) parts.push(anime.type);
  if (anime.score) parts.push(`⭐ ${anime.score}`);
  if (anime.estimation) parts.push(anime.estimation);
  if (todayBigSubtitle) todayBigSubtitle.textContent = parts.join(" • ");

  if (todaySubTitle) {
    todaySubTitle.textContent = anime.genres ? `Genre: ${anime.genres}` : "";
  }
}

function goToTodayDetail() {
  if (!todayAnimeList.length) return;
  const current = todayAnimeList[todayIndex] || todayAnimeList[0];
  if (!current || !current.slug) return;
  window.location.href = `/anime/detail?slug=${encodeURIComponent(current.slug)}`;
}

if (todayBigBtn) {
  todayBigBtn.addEventListener("click", goToTodayDetail);
}
if (todayBigPoster) {
  todayBigPoster.addEventListener("click", goToTodayDetail);
}
if (todayBigTitle) {
  todayBigTitle.addEventListener("click", goToTodayDetail);
}

// ---------- HOME LISTS ----------

async function loadHome() {
  let json;
  try {
    json = await apiGet("/anime/samehadaku/home");
  } catch {
    return;
  }
  if (!json || json.status !== "success") return;

  const recent = json.data && json.data.recent && Array.isArray(json.data.recent.animeList)
    ? json.data.recent.animeList
    : [];

  const top10 = json.data && json.data.top10 && Array.isArray(json.data.top10.animeList)
    ? json.data.top10.animeList
    : [];

  // Render recent -> ongoing grid
  if (ongoingGridHome) {
    ongoingGridHome.innerHTML = "";
    recent.slice(0, 9).forEach((a) => {
      const card = createAnimeCard(a, {
        badgeTop: "Baru",
        badgeBottom: formatEpisodeLabel(a.episodes),
        meta: a.releasedOn || "",
      });
      ongoingGridHome.appendChild(card);
    });
  }

  // Render top10 -> complete row (dipakai sebagai "Top 10")
  if (completeRowHome) {
    completeRowHome.innerHTML = "";
    top10.forEach((a) => {
      const card = createAnimeCard(a, {
        badgeTop: a.rank != null ? `#${a.rank}` : "",
        rating: a.score || "",
        meta: "",
      });
      completeRowHome.appendChild(card);
    });
  }
}

// ---------- BUTTONS ----------

if (seeAllOngoingBtn) {
  seeAllOngoingBtn.addEventListener("click", () => {
    window.location.href = "/anime/ongoing";
  });
}

if (seeAllCompleteBtn) {
  seeAllCompleteBtn.addEventListener("click", () => {
    window.location.href = "/anime/complete";
  });
}

// ---------- INIT ----------

document.addEventListener("DOMContentLoaded", () => {
  loadTodayAnime();
  loadHome();
});
