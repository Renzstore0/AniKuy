// assets/js/home.js

// util nama hari Indonesia
function getTodayName() {
  const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  return days[new Date().getDay()];
}

// LOAD RILIS HARI INI
async function loadTodayAnime() {
  const section = document.getElementById("todaySection");
  const listEl = document.getElementById("todayRowHome");
  const subtitleEl = document.getElementById("todaySubtitle");
  const seeAllBtn = document.getElementById("todaySeeAllBtn");

  if (!section || !listEl) return;

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
  section.style.display = "block";
  if (subtitleEl) {
    subtitleEl.textContent = `Jadwal tayang hari ${todayName}`;
  }

  listEl.innerHTML = "";
  todayObj.anime_list.forEach((a) => {
    const item = {
      title: a.anime_name,
      poster: a.poster,
      slug: a.slug,
    };
    const card = createAnimeCard(item, {
      badgeTop: "Baru",
      meta: todayName,
    });
    listEl.appendChild(card);
  });

  if (seeAllBtn) {
    seeAllBtn.addEventListener("click", () => {
      // arahkan ke Explore tab Jadwal (sesuaikan nanti kalau ada query param khusus)
      window.location.href = "/explore?tab=schedule";
    });
  }
}

// LOAD SEDANG TAYANG
async function loadOngoingHome() {
  const grid = document.getElementById("ongoingGridHome");
  if (!grid) return;

  grid.innerHTML = "";

  let json;
  try {
    json = await apiGet("/anime/ongoing");
  } catch {
    return;
  }

  if (!json || json.status !== "success" || !Array.isArray(json.data)) return;

  json.data.forEach((a) => {
    const item = {
      title: a.title || a.anime_name,
      poster: a.poster,
      slug: a.slug,
    };

    const card = createAnimeCard(item, {
      badgeTop: "Baru",
      badgeBottom: a.episode ? `Episode ${a.episode}` : null,
      meta: a.day || "",
    });

    grid.appendChild(card);
  });
}

// LOAD SELESAI DITAYANGKAN
async function loadCompleteHome() {
  const row = document.getElementById("completeRowHome");
  if (!row) return;

  row.innerHTML = "";

  let json;
  try {
    json = await apiGet("/anime/complete");
  } catch {
    return;
  }

  if (!json || json.status !== "success" || !Array.isArray(json.data)) return;

  json.data.forEach((a) => {
    const item = {
      title: a.title || a.anime_name,
      poster: a.poster,
      slug: a.slug,
    };

    const card = createAnimeCard(item, {
      meta: a.type || "Tamat",
    });

    row.appendChild(card);
  });
}

// INIT HOME
document.addEventListener("DOMContentLoaded", () => {
  if (document.body.dataset.page !== "home") return;

  const seeAllOngoingBtn = document.getElementById("seeAllOngoingBtn");
  const seeAllCompleteBtn = document.getElementById("seeAllCompleteBtn");

  if (seeAllOngoingBtn) {
    seeAllOngoingBtn.addEventListener("click", () => {
      window.location.href = "/explore";
    });
  }

  if (seeAllCompleteBtn) {
    seeAllCompleteBtn.addEventListener("click", () => {
      window.location.href = "/explore";
    });
  }

  loadTodayAnime();
  loadOngoingHome();
  loadCompleteHome();
});
