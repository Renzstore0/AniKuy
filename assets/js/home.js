const ongoingGridHome = document.getElementById("ongoingGridHome");
const completeRowHome = document.getElementById("completeRowHome");
const seeAllOngoingBtn = document.getElementById("seeAllOngoingBtn");
const seeAllCompleteBtn = document.getElementById("seeAllCompleteBtn");

// elemen "Rilis Hari Ini" (hero) — tetap dipertahankan (kalau endpoint ada)
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
function getTodayName() {
  const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  return days[new Date().getDay()];
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

// --- RILIS HARI INI (HERO) --- (tetap seperti awal)
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

  todayPoster.src = current.poster;
  todayPoster.alt = current.title;
  todayTitle.textContent = current.title;

  if (todayPosterPrev && prev) {
    todayPosterPrev.src = prev.poster;
    todayPosterPrev.alt = prev.title;
  }
  if (todayPosterNext && next) {
    todayPosterNext.src = next.poster;
    todayPosterNext.alt = next.title;
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

async function loadTodayAnime() {
  if (!todaySection) return;

  let json;
  try {
    // kalau endpoint schedule kamu masih ada, ini tetap jalan
    json = await apiGet("/anime/schedule");
  } catch {
    return;
  }

  if (!json || json.status !== "success" || !Array.isArray(json.data)) return;

  const todayName = getTodayName();
  const todayObj = json.data.find((d) => d.day === todayName);

  if (!todayObj || !Array.isArray(todayObj.anime_list) || !todayObj.anime_list.length) return;

  todayAnimeList = todayObj.anime_list.map((a) => ({
    title: a.anime_name,
    poster: a.poster,
    slug: a.slug,
  }));

  if (!todayAnimeList.length) return;

  todaySection.style.display = "block";
  if (todayHeaderTitle) todayHeaderTitle.textContent = `Anime Rilis Hari Ini - ${todayName}`;

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

// --- HOME (RECENT & TOP10 dari Samehadaku) ---
async function loadHome() {
  if (!ongoingGridHome || !completeRowHome) return;

  let data;
  try {
    data = await apiGet("/anime/samehadaku/home");
  } catch {
    return;
  }

  if (!data || data.status !== "success" || !data.data) {
    showToast("Data home tidak valid");
    return;
  }

  const recentList = (data.data.recent && data.data.recent.animeList) || [];
  const top10List = (data.data.top10 && data.data.top10.animeList) || [];

  ongoingGridHome.innerHTML = "";
  completeRowHome.innerHTML = "";

  // SEDANG TAYANG / TERBARU (pakai recent)
  recentList.slice(0, 9).forEach((a) => {
    const item = {
      title: a.title || "-",
      poster: a.poster || "",
      slug: a.animeId || a.slug || "", // PENTING: animeId = slug internal
      animeId: a.animeId,
    };

    const card = createAnimeCard(item, {
      badgeTop: "Baru",
      badgeBottom: formatEpisodeLabel(a.episodes || ""),
      meta: a.releasedOn || "",
    });

    ongoingGridHome.appendChild(card);
  });

  // SELESAI / POPULER (pakai top10)
  top10List.slice(0, 15).forEach((a) => {
    const item = {
      title: a.title || "-",
      poster: a.poster || "",
      slug: a.animeId || a.slug || "",
      animeId: a.animeId,
    };

    const card = createAnimeCard(item, {
      rating: a.score && a.score !== "" ? a.score : "N/A",
      meta: a.rank ? `#${a.rank}` : "",
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
    window.location.href = "/anime/complete";
  });
}

// --- INIT ---
document.addEventListener("DOMContentLoaded", () => {
  loadHome();
  loadTodayAnime();
});
