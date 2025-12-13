(() => {
  "use strict";

  const $$ = (s) => document.querySelectorAll(s);
  const $ = (id) => document.getElementById(id);

  const tabs = $$(".explore-tab");
  const panels = $$(".explore-panel");
  const chips = $("genreChipList");
  const schedWrap = $("scheduleContainer");
  const schedLoad = $("scheduleLoading");

  let schedLoaded = false;

  // === utils ===
  const toID = (d) =>
    ({ monday:"Senin",tuesday:"Selasa",wednesday:"Rabu",thursday:"Kamis",friday:"Jumat",saturday:"Sabtu",sunday:"Minggu" }[
      String(d || "").toLowerCase()
    ] || d || "-");

  const slugFromHref = (h) =>
    String(h || "").split("/").filter(Boolean).pop() || "";

  // === genres ===
  async function loadGenres() {
    if (!chips) return;
    let j;
    try { j = await apiGet("/anime/samehadaku/genres"); }
    catch { try { j = await apiGet("/anime/genre"); } catch { return; } }
    if (j?.status !== "success") return;

    const list = j.data?.genreList || j.data || [];
    chips.innerHTML = "";

    list.forEach((g) => {
      const name = g.name || g.title || "-";
      const slug = g.slug || g.genreId || "";
      const b = document.createElement("button");
      b.type = "button";
      b.className = "genre-chip";
      b.textContent = name;
      b.onclick = () =>
        slug &&
        (location.href = `/anime/genre?slug=${encodeURIComponent(
          slug
        )}&name=${encodeURIComponent(name)}`);
      chips.appendChild(b);
    });
  }

  // === schedule ===
  async function loadSchedule() {
    if (!schedWrap || !schedLoad) return;
    schedLoaded = true;
    schedWrap.innerHTML = "";
    schedLoad.classList.add("show");

    try {
      let j;
      try { j = await apiGet("/anime/samehadaku/schedule"); }
      catch { j = await apiGet("/anime/schedule"); }
      if (j?.status !== "success") return;

      const days = j.data?.days || j.data || [];
      schedWrap.innerHTML = "";

      days.forEach((d) => {
        const list = d.animeList || d.anime_list || [];
        const day = document.createElement("div");
        day.className = "schedule-day";
        day.innerHTML = `
          <div class="schedule-day-header">
            <div class="schedule-day-title">${toID(d.day)}</div>
            <div class="schedule-day-count">${
              list.length ? `${list.length} anime` : "Tidak ada anime"
            }</div>
          </div>
        `;
        const row = document.createElement("div");
        row.className = "anime-row";

        list.forEach((a) =>
          row.appendChild(
            createAnimeCard(
              {
                title: a.title || a.anime_name || "-",
                poster: a.poster || "/assets/img/placeholder-poster.png",
                slug: a.animeId || a.slug || slugFromHref(a.href),
              },
              {}
            )
          )
        );

        day.appendChild(row);
        schedWrap.appendChild(day);
      });
    } catch {
      typeof showToast === "function" && showToast("Gagal memuat jadwal");
    } finally {
      schedLoad.classList.remove("show");
    }
  }

  // === tabs ===
  document.addEventListener("DOMContentLoaded", () => {
    tabs.forEach((b) =>
      b.addEventListener("click", () => {
        const t = b.dataset.tab;
        if (!t) return;
        tabs.forEach((x) => x.classList.toggle("active", x === b));
        panels.forEach((p) =>
          p.classList.toggle("active", p.dataset.tab === t)
        );
        if (t === "schedule" && !schedLoaded) loadSchedule();
      })
    );
    loadGenres();
  });
})();
