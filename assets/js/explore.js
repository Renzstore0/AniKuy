const exploreTabs = document.querySelectorAll(".explore-tab");
const explorePanels = document.querySelectorAll(".explore-panel");
const genreChipList = document.getElementById("genreChipList");
const scheduleContainer = document.getElementById("scheduleContainer");
const scheduleLoading = document.getElementById("scheduleLoading");

let scheduleLoaded = false;

// LOAD GENRES LIST (chip) — tetap
async function loadGenres() {
  if (!genreChipList) return;

  let json;
  try {
    json = await apiGet("/anime/genre");
  } catch {
    return;
  }
  if (!json || json.status !== "success") return;

  genreChipList.innerHTML = "";
  (json.data || []).forEach((g) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "genre-chip";
    chip.textContent = g.name;
    chip.addEventListener("click", () => {
      if (!g.slug) return;
      const url = `/anime/genre?slug=${encodeURIComponent(
        g.slug
      )}&name=${encodeURIComponent(g.name)}`;
      window.location.href = url;
    });
    genreChipList.appendChild(chip);
  });
}

// LOAD SCHEDULE — ✅ ganti respon ke Samehadaku
async function loadSchedule() {
  if (!scheduleContainer || !scheduleLoading) return;

  scheduleLoaded = true;
  scheduleContainer.innerHTML = "";
  scheduleLoading.classList.add("show");

  try {
    const json = await apiGet("/anime/samehadaku/schedule");
    if (!json || json.status !== "success") return;

    const days = json.data && Array.isArray(json.data.days) ? json.data.days : [];
    scheduleContainer.innerHTML = "";

    days.forEach((day) => {
      const dayWrap = document.createElement("div");
      dayWrap.className = "schedule-day";

      const header = document.createElement("div");
      header.className = "schedule-day-header";

      const title = document.createElement("div");
      title.className = "schedule-day-title";
      title.textContent = day.day || "-";

      const count = document.createElement("div");
      count.className = "schedule-day-count";
      const len = (day.animeList || []).length;
      count.textContent = len ? `${len} anime` : "Tidak ada anime";

      header.appendChild(title);
      header.appendChild(count);
      dayWrap.appendChild(header);

      const row = document.createElement("div");
      row.className = "anime-row";

      (day.animeList || []).forEach((a) => {
        const item = {
          title: a.title,
          poster: a.poster,
          slug: a.animeId, // Samehadaku pakai animeId untuk detail
        };
        const card = createAnimeCard(item, {});
        row.appendChild(card);
      });

      dayWrap.appendChild(row);
      scheduleContainer.appendChild(dayWrap);
    });
  } finally {
    scheduleLoading.classList.remove("show");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // segmented tabs
  exploreTabs.forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.tab;
      if (!tab) return;

      exploreTabs.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      explorePanels.forEach((panel) => {
        panel.classList.toggle("active", panel.dataset.tab === tab);
      });

      if (tab === "schedule" && !scheduleLoaded) {
        loadSchedule();
      }
    });
  });

  loadGenres();
});
