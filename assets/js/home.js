// assets/js/home.js

const ongoingGridHome = document.getElementById("ongoingGridHome");
const completeRowHome = document.getElementById("completeRowHome");
const seeAllOngoingBtn = document.getElementById("seeAllOngoingBtn");
const seeAllCompleteBtn = document.getElementById("seeAllCompleteBtn");

// elemen "Rilis Hari Ini" (hero)
const todaySection = document.getElementById("todaySection");
const todayPoster = document.getElementById("todayPoster");
const todayTitle = document.getElementById("todayTitle");
const todaySubtitle = document.getElementById("todaySubtitle");
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

  todayPoster.src = current.poster;
  todayPoster.alt = current.title;
  todayTitle.textContent = current.title;

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

  if (!todayObj || !Array.isArray(todayObj.anime_list) || !todayObj.anime_list.length) {
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
  if (todaySubtitle) {
    todaySubtitle.textContent = `Anime rilis hari ${todayName}`;
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
  if (todayPrevBtn) {
    todayPrevBtn.addEventListener("click", () => {
      if (!todayAnimeList.length) return;
      todayIndex = (todayIndex - 1 + todayAnimeList.length) % todayAnimeList.length;
      updateTodayHero();
    });
  }
  if (todayNextBtn) {
    todayNextBtn.addEventListener("click", () => {
      if (!todayAnimeList.length) return;
      todayIndex = (todayIndex + 1) % todayAnimeList.length;
      updateTodayHero();
    });
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
