// assets/js/home.js

const ongoingGridHome = document.getElementById("ongoingGridHome");
const completeRowHome = document.getElementById("completeRowHome");
const seeAllOngoingBtn = document.getElementById("seeAllOngoingBtn");
const seeAllCompleteBtn = document.getElementById("seeAllCompleteBtn");

// elemen "Rilis Hari Ini"
const todaySection = document.getElementById("todaySection");
const todayRowHome = document.getElementById("todayRowHome");
const todaySubtitle = document.getElementById("todaySubtitle");
const todaySeeAllBtn = document.getElementById("todaySeeAllBtn");

// --- UTIL HARI ---

function getTodayName() {
  const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  return days[new Date().getDay()];
}

// --- RILIS HARI INI ---

async function loadTodayAnime() {
  if (!todaySection || !todayRowHome) return;

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

  // tampilkan section
  todaySection.style.display = "block";
  if (todaySubtitle) {
    todaySubtitle.textContent = `Jadwal tayang hari ${todayName}`;
  }

  todayRowHome.innerHTML = "";
  todayObj.anime_list.forEach((a) => {
    const item = {
      title: a.anime_name,
      poster: a.poster,
      slug: a.slug,
    };

    const card = createAnimeCard(item, {
      badgeTop: "Hari ini",
      meta: todayName,
    });

    todayRowHome.appendChild(card);
  });

  if (todaySeeAllBtn) {
    todaySeeAllBtn.addEventListener("click", () => {
      window.location.href = "/explore?tab=schedule";
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
