const ongoingGridHome = document.getElementById("ongoingGridHome");
const completeRowHome = document.getElementById("completeRowHome");
const seeAllOngoingBtn = document.getElementById("seeAllOngoingBtn");
const seeAllCompleteBtn = document.getElementById("seeAllCompleteBtn");

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

// --- UTIL HARI (buat cari schedule Samehadaku yang pakai EN) ---
function getTodayName() {
  const daysId = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const daysEn = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const idx = new Date().getDay();
  return { id: daysId[idx], en: daysEn[idx] };
}

// --- FORMAT LABEL EPISODE (dipakai Home & Ongoing) ---
function formatEpisodeLabel(text) {
  if (!text) return "";

  let t = String(text).trim();

  // "Total 10 Episode" / "Total 10 Eps"
  let m = t.match(/^Total\s+(\d+)\s*(Episode|Eps?)?/i);
  if (m) return `Eps ${m[1]}`;

  // "Episode 10"
  m = t.match(/^Episode\s+(\d+)/i);
  if (m) return `Eps ${m[1]}`;

  // "10 Episode" / "10 Eps" / "10"
  m = t.match(/^(\d+)\s*(Episode|Eps?)?$/i);
  if (m) return `Eps ${m[1]}`;

  // fallback: ganti kata Episode → Eps
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
  if (
    !todaySection ||
    !todayPoster ||
    !todayTitle ||
    !todayDots ||
    !todayAnimeList.length
  ) {
    return;
  }

  const current = todayAnimeList[todayIndex];
  if (!current) return;

  const len = todayAnimeList.length;
  const prevIndex = (todayIndex - 1 + len) % len;
  const nextIndex = (todayIndex + 1) % len;

  const prev = todayAnimeList[prevIndex];
  const next = todayAnimeList[nextIndex];

  // poster utama
  todayPoster.src = current.poster;
  todayPoster.alt = current.title;
  todayTitle.textContent = current.title;

  // poster sebelum
  if (todayPosterPrev && prev) {
    todayPosterPrev.src = prev.poster;
    todayPosterPrev.alt = prev.title;
  }

  // poster sesudah
  if (todayPosterNext && next) {
    todayPosterNext.src = next.poster;
    todayPosterNext.alt = next.title;
  }

  // dots
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
    // ✅ ganti respon: schedule Samehadaku
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

  if (!todayObj || !Array.isArray(todayObj.animeList) || !todayObj.animeList.length) {
    return;
  }

  // ✅ mapping ke bentuk internal UI (tetap sama)
  todayAnimeList = todayObj.animeList.map((a) => ({
    title: a.title,
    poster: a.poster,
    slug: a.animeId, // Samehadaku pakai animeId untuk detail
  }));

  if (!todayAnimeList.length) return;

  todaySection.style.display = "block";
  if (todayHeaderTitle) {
    todayHeaderTitle.textContent = `Anime Rilis Hari Ini - ${todayName.id}`;
  }

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

// --- HOME (SEDANG TAYANG & SELESAI) ---
async function loadHome() {
  if (!ongoingGridHome || !completeRowHome) return;

  let data;
  try {
    // ✅ ganti respon: home Samehadaku
    data = await apiGet("/anime/samehadaku/home");
  } catch {
    return;
  }

  if (!data || data.status !== "success" || !data.data) {
    showToast("Data home tidak valid");
    return;
  }

  const ongoing = (data.data.recent && Array.isArray(data.data.recent.animeList))
    ? data.data.recent.animeList
    : [];

  // UI kamu menamai "complete", kita mapping ke Top10 (biar ada konten)
  const complete = (data.data.top10 && Array.isArray(data.data.top10.animeList))
    ? data.data.top10.animeList
    : [];

  ongoingGridHome.innerHTML = "";
  completeRowHome.innerHTML = "";

  // SEDANG TAYANG (home) – badge bawah: Eps ..
  ongoing.slice(0, 9).forEach((a) => {
    const item = {
      title: a.title,
      poster: a.poster,
      slug: a.slug, // Samehadaku home recent biasanya sudah ada slug
    };

    const card = createAnimeCard(item, {
      badgeTop: "Baru",
      badgeBottom: formatEpisodeLabel(a.episodes || ""),
      meta: a.releasedOn || "",
    });
    ongoingGridHome.appendChild(card);
  });

  // SELESAI DITAYANGKAN (home) – pakai rating (score)
  complete.slice(0, 15).forEach((a) => {
    const item = {
      title: a.title,
      poster: a.poster,
      slug: a.slug,
    };

    const card = createAnimeCard(item, {
      rating: a.score && a.score !== "" ? a.score : "N/A",
      meta: "",
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
