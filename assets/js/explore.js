const exploreTabs = document.querySelectorAll(".explore-tab");
const explorePanels = document.querySelectorAll(".explore-panel");
const genreChipList = document.getElementById("genreChipList");
const scheduleContainer = document.getElementById("scheduleContainer");
const scheduleLoading = document.getElementById("scheduleLoading");

let scheduleLoaded = false;

// --- HARI (EN -> ID) ---
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
  return map[key] || day; // fallback kalau sudah Indonesia / format lain
}

// LOAD GENRES LIST (chip) — support Samehadaku (robust)
async function loadGenres() {
  if (!genreChipList) return;

  let json;
  try {
    json = await apiGet("/anime/samehadaku/genres");
  } catch {
    try {
      json = await apiGet("/anime/genre");
    } catch {
      return;
    }
  }

  if (!json || json.status !== "success") return;

  const list =
    (Array.isArray(json.data) && json.data) ||
    (json.data && Array.isArray(json.data.genreList) && json.data.genreList) ||
    [];

  genreChipList.innerHTML = "";

  list.forEach((g) => {
    const name = g.name || g.title || "-";
    const slug = g.slug || g.genreId || "";

    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "genre-chip";
    chip.textContent = name;

    chip.addEventListener("click", () => {
      if (!slug) return;
      const url = `/anime/genre?slug=${encodeURIComponent(
        slug
      )}&name=${encodeURIComponent(name)}`;
      window.location.href = url;
    });

    genreChipList.appendChild(chip);
  });
}

// helper: ambil animeId dari href samehadaku kalau animeId kosong
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

// LOAD SCHEDULE — pakai Samehadaku schedule (baru), fallback ke schedule lama
async function loadSchedule() {
  if (!scheduleContainer || !scheduleLoading) return;

  scheduleLoaded = true;
  scheduleContainer.innerHTML = "";
  scheduleLoading.classList.add("show");

  try {
    let json;

    // 1) endpoint baru
    try {
      json = await apiGet("/anime/samehadaku/schedule");
    } catch {
      // 2) fallback endpoint lama
      json = await apiGet("/anime/schedule");
    }

    if (!json || json.status !== "success") return;

    scheduleContainer.innerHTML = "";

    // bentuk data baru: json.data.days = [{ day, animeList: [...] }]
    // bentuk data lama: json.data = [{ day, anime_list: [...] }]
    const days =
      (json.data && Array.isArray(json.data.days) && json.data.days) ||
      (Array.isArray(json.data) && json.data) ||
      [];

    days.forEach((day) => {
      const dayWrap = document.createElement("div");
      dayWrap.className = "schedule-day";

      const header = document.createElement("div");
      header.className = "schedule-day-header";

      const title = document.createElement("div");
      title.className = "schedule-day-title";
      title.textContent = toIndoDay(day.day) || "-";

      const list =
        (Array.isArray(day.animeList) && day.animeList) ||
        (Array.isArray(day.anime_list) && day.anime_list) ||
        [];

      const count = document.createElement("div");
      count.className = "schedule-day-count";
      const len = list.length;
      count.textContent = len ? `${len} anime` : "Tidak ada anime";

      header.appendChild(title);
      header.appendChild(count);
      dayWrap.appendChild(header);

      const row = document.createElement("div");
      row.className = "anime-row";

      list.forEach((a) => {
        const slug =
          a.animeId || a.slug || parseAnimeIdFromHref(a.href) || "";

        const item = {
          title: a.title || a.anime_name || "-",
          poster: a.poster || "/assets/img/placeholder-poster.png",
          slug,
        };

        const card = createAnimeCard(item, {});
        row.appendChild(card);
      });

      dayWrap.appendChild(row);
      scheduleContainer.appendChild(dayWrap);
    });
  } catch (e) {
    if (typeof showToast === "function") showToast("Gagal memuat jadwal");
  } finally {
    scheduleLoading.classList.remove("show");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  exploreTabs.forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.tab;
      if (!tab) return;

      exploreTabs.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      explorePanels.forEach((panel) => {
        panel.classList.toggle("active", panel.dataset.tab === tab);
      });

      if (tab === "schedule" && !scheduleLoaded) loadSchedule();
    });
  });

  loadGenres();
});
