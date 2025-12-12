const exploreTabs = document.querySelectorAll(".explore-tab");
const explorePanels = document.querySelectorAll(".explore-panel");
const genreChipList = document.getElementById("genreChipList");
const scheduleContainer = document.getElementById("scheduleContainer");
const scheduleLoading = document.getElementById("scheduleLoading");

let scheduleLoaded = false;

// LOAD GENRES LIST (chip) — support Samehadaku (robust)
async function loadGenres() {
  if (!genreChipList) return;

  let json;
  try {
    // jika endpoint ini ada, pakai ini
    json = await apiGet("/anime/samehadaku/genres");
  } catch {
    // fallback ke endpoint lama kalau project kamu masih pakai itu
    try {
      json = await apiGet("/anime/genre");
    } catch {
      return;
    }
  }

  if (!json || json.status !== "success") return;

  // beberapa kemungkinan bentuk data:
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
      const url = `/anime/genre?slug=${encodeURIComponent(slug)}&name=${encodeURIComponent(name)}`;
      window.location.href = url;
    });

    genreChipList.appendChild(chip);
  });
}

// LOAD SCHEDULE (tetap)
async function loadSchedule() {
  if (!scheduleContainer || !scheduleLoading) return;

  scheduleLoaded = true;
  scheduleContainer.innerHTML = "";
  scheduleLoading.classList.add("show");

  try {
    const json = await apiGet("/anime/schedule");
    if (!json || json.status !== "success") return;

    scheduleContainer.innerHTML = "";

    (json.data || []).forEach((day) => {
      const dayWrap = document.createElement("div");
      dayWrap.className = "schedule-day";

      const header = document.createElement("div");
      header.className = "schedule-day-header";

      const title = document.createElement("div");
      title.className = "schedule-day-title";
      title.textContent = day.day || "-";

      const count = document.createElement("div");
      count.className = "schedule-day-count";
      const len = (day.anime_list || []).length;
      count.textContent = len ? `${len} anime` : "Tidak ada anime";

      header.appendChild(title);
      header.appendChild(count);
      dayWrap.appendChild(header);

      const row = document.createElement("div");
      row.className = "anime-row";

      (day.anime_list || []).forEach((a) => {
        const item = {
          title: a.anime_name,
          poster: a.poster,
          slug: a.slug,
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
