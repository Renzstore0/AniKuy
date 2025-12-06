// assets/js/home.js

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

// --- UTIL HARI ---

function getTodayName() {
  const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  return days[new Date().getDay()];
}

// --- RILIS HARI INI (HERO) ---

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
}

function goToTodayDetail() {
  const current = todayAnimeList[todayIndex];
  if (!current || !current.slug) return;
  const url = `/anime/detail?slug=${encodeURIComponent(current.slug)}`;
  window.location.href = url;
}

function goTodayStep(delta) {
  if (!todayAnimeList.length) return;
  const len = todayAnimeList.length;
  todayIndex = (todayIndex + delta + len) % len;
  updateTodayHero();
}

async function loadTodayAnime() {
  if (!todaySection) return;

  let json;
  try {
    json = await apiGet("/anime/schedule");
  } catch {
    return;
  }

  if (!json || json.status !== "success" || !Array.isArray(json.data)) return;

  const todayName = getTodayName();
  const todayObj = json.data.find((d) => d.day === todayName);

  if (
    !todayObj ||
    !Array.isArray(todayObj.anime_list) ||
    !todayObj.anime_list.length
  ) {
    return;
  }

  // mapping ke list internal
  todayAnimeList = todayObj.anime_list.map((a) => ({
    title: a.anime_name,
    poster: a.poster,
    slug: a.slug,
  }));

  if (!todayAnimeList.length) return;

  // tampilkan section
  todaySection.style.display = "block";
  if (todayHeaderTitle) {
    todayHeaderTitle.textContent = `Anime Rilis Hari Ini - ${todayName}`;
  }

  todayIndex = 0;
  updateTodayHero();

  // event tombol
  if (todayWatchBtn) {
    todayWatchBtn.addEventListener("click", goToTodayDetail);
  }
  if (todayPoster) {
    todayPoster.addEventListener("click", goToTodayDetail);
  }

  // klik poster samping untuk pindah slide
  if (todayPosterPrev) {
    todayPosterPrev.addEventListener("click", () => goTodayStep(-1));
  }
  if (todayPosterNext) {
    todayPosterNext.addEventListener("click", () => goTodayStep(1));
  }

  if (todayPrevBtn) {
    todayPrevBtn.addEventListener("click", () => goTodayStep(-1));
  }
  if (todayNextBtn) {
    todayNextBtn.addEventListener("click", () => goTodayStep(1));
  }
}

// --- HOME (SEDANG TAYANG & SELESAI) ---

async function loadHome() {
  if (!ongoingGridHome || !completeRowHome) return;

  let data;
  try {
    data = await apiGet("/anime/home");
  } catch {
    return;
  }

  if (!data || data.status !== "success") {
    showToast("Data home tidak valid");
    return;
  }

  const ongoing = data.data.ongoing_anime || [];
  const complete = data.data.complete_anime || [];

  ongoingGridHome.innerHTML = "";
  completeRowHome.innerHTML = "";

  ongoing.slice(0, 9).forEach((a) => {
    const card = createAnimeCard(a, {
      badgeTop: "Baru",
      badgeBottom: a.current_episode || "",
      meta: a.release_day || "",
    });
    ongoingGridHome.appendChild(card);
  });

  complete.slice(0, 15).forEach((a) => {
    const card = createAnimeCard(a, {
      rating: a.rating && a.rating !== "" ? a.rating : "N/A",
      badgeBottom: `${a.episode_count || "?"} Eps`,
      meta: a.last_release_date || "",
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
