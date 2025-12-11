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
let todayAutoTimer = null;
const TODAY_AUTO_MS = 7000;

// --- UTIL HARI ---
function getTodayName() {
  const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  return days[new Date().getDay()];
}

// bersihkan poster bila formatnya seperti "[https://...](https://...)"
function cleanUrlMaybeMarkdown(u) {
  if (!u) return u;
  try {
    // cari dalam tanda kurung seperti [text](url)
    const m = String(u).match(/\((https?:\/\/[^\s)]+)\)|\[(https?:\/\/[^\]\s]+)\]|\b(https?:\/\/[^\s\]\)]+)\b/);
    if (m) {
      for (let i = 1; i < m.length; i++) {
        if (m[i]) return m[i];
      }
    }
  } catch (e) {}
  return String(u).replace(/^\[|\]$/g, "");
}

// --- FORMAT LABEL EPISODE (dipakai Home & Ongoing) ---
function formatEpisodeLabel(text) {
  if (text === null || text === undefined || text === "") return "";
  let t = String(text).trim();

  // jika angka saja
  let m = t.match(/^(\d+)\s*(Episode|Eps?)?$/i);
  if (m) return `Eps ${m[1]}`;

  // "Total 10 Episode" / "Total 10 Eps"
  m = t.match(/^Total\s+(\d+)\s*(Episode|Eps?)?/i);
  if (m) return `Eps ${m[1]}`;

  // "Episode 10"
  m = t.match(/^Episode\s+(\d+)/i);
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
  const offset = dotRect.left - wrapRect.left - wrapRect.width / 2 + dotRect.width / 2;

  todayDots.scrollBy({ left: offset, behavior: "smooth" });
}

function renderTodayDots() {
  if (!todayDots) return;
  todayDots.innerHTML = "";
  todayAnimeList.forEach((_, i) => {
    const dot = document.createElement("span");
    dot.className = "hero-dot";
    if (i === todayIndex) dot.classList.add("active");
    dot.addEventListener("click", () => {
      todayIndex = i;
      updateTodayHero();
      restartTodayAuto();
    });
    todayDots.appendChild(dot);
  });
}

function updateTodayHero() {
  if (!todaySection || !todayPoster || !todayTitle || !todayDots || !todayAnimeList.length) {
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
  todayPoster.src = current.poster || "";
  todayPoster.alt = current.title || "";
  todayTitle.textContent = current.title || "";

  // poster sebelum
  if (todayPosterPrev && prev) {
    todayPosterPrev.src = prev.poster || "";
    todayPosterPrev.alt = prev.title || "";
  }

  // poster sesudah
  if (todayPosterNext && next) {
    todayPosterNext.src = next.poster || "";
    todayPosterNext.alt = next.title || "";
  }

  // dots
  renderTodayDots();

  // auto-scroll dots supaya titik aktif selalu kelihatan
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

  // coba endpoint schedule dulu, jika gagal fallback dari home/ongoing
  let json;
  try {
    json = await apiGet("/anime/schedule");
  } catch {
    json = null;
  }

  let list = [];

  // format schedule: { data: [ { day: "Senin", anime_list: [...] }, ... ] }
  if (json && json.status === "success" && Array.isArray(json.data)) {
    const todayName = getTodayName();
    const todayObj = json.data.find((d) => d.day === todayName);
    if (todayObj && Array.isArray(todayObj.anime_list) && todayObj.anime_list.length) {
      list = todayObj.anime_list.map((a) => ({
        title: a.anime_name || a.title || "",
        poster: cleanUrlMaybeMarkdown(a.poster || a.thumbnail || ""),
        slug: a.slug || a.animeId || "",
      }));
    }
  }

  // fallback: jika schedule kosong, ambil dari /anime/home ongoing/completed yang mengandung releaseDay
  if (!list.length) {
    try {
      const home = await apiGet("/anime/home");
      if (home && home.status === "success" && home.data) {
        // coba beberapa kemungkinan struktur
        const candidates = [];
        // struktur baru: data.ongoing.animeList
        if (home.data.ongoing && Array.isArray(home.data.ongoing.animeList)) {
          candidates.push(...home.data.ongoing.animeList);
        }
        // struktur lama: data.data.ongoing_anime
        if (home.data.data && Array.isArray(home.data.data?.ongoing_anime)) {
          candidates.push(...home.data.data.ongoing_anime);
        }
        // struktur alternate: data.data.ongoing
        if (home.data.ongoing && Array.isArray(home.data.ongoing)) {
          candidates.push(...home.data.ongoing);
        }

        const todayName = getTodayName();
        const filtered = candidates.filter((a) => {
          const d = (a.releaseDay || a.release_day || a.releaseDayName || a.releaseDay || "").toString();
          return d && d.toLowerCase() === todayName.toLowerCase();
        });

        if (filtered.length) {
          list = filtered.map((a) => ({
            title: a.title || a.anime_name || "",
            poster: cleanUrlMaybeMarkdown(a.poster || a.thumbnail || ""),
            slug: a.animeId || a.slug || a.href || "",
          }));
        }
      }
    } catch (e) {
      // ignore
    }
  }

  if (!list.length) {
    // jika tetap kosong, sembunyikan section dan return
    if (todaySection) todaySection.style.display = "none";
    return;
  }

  todayAnimeList = list;
  todayIndex = 0;

  // tampilkan section
  todaySection.style.display = "block";
  if (todayHeaderTitle) {
    todayHeaderTitle.textContent = `Anime Rilis Hari Ini - ${getTodayName()}`;
  }

  updateTodayHero();
  restartTodayAuto();

  // event tombol
  if (todayWatchBtn) {
    todayWatchBtn.addEventListener("click", () => goToTodayDetail());
  }
  if (todayPoster) {
    todayPoster.addEventListener("click", () => goToTodayDetail());
  }
  if (todayPosterPrev) {
    todayPosterPrev.addEventListener("click", () => goTodayStep(-1, true));
  }
  if (todayPosterNext) {
    todayPosterNext.addEventListener("click", () => goTodayStep(1, true));
  }
  if (todayPrevBtn) {
    todayPrevBtn.addEventListener("click", () => goTodayStep(-1, true));
  }
  if (todayNextBtn) {
    todayNextBtn.addEventListener("click", () => goTodayStep(1, true));
  }
}

// --- HOME (SEDANG TAYANG & SELESAI) ---

// buat adapter/normalizer untuk entry anime supaya createAnimeCard tetap dapat dipakai
function normalizeAnimeEntry(a) {
  if (!a) return {};
  return {
    title: a.title || a.anime_name || "",
    poster: cleanUrlMaybeMarkdown(a.poster || a.thumbnail || a.image || ""),
    current_episode: a.current_episode || a.episodes || a.latest_episode || "",
    release_day: a.releaseDay || a.release_day || a.releaseDayName || a.releaseDay || "",
    rating: a.score || a.rating || "",
    last_release_date: a.latestReleaseDate || a.lastReleaseDate || a.last_release_date || "",
    slug: a.animeId || a.slug || (a.href ? (a.href.split("/").pop() || "") : ""),
  };
}

async function loadHome() {
  if (!ongoingGridHome || !completeRowHome) return;

  let data;
  try {
    data = await apiGet("/anime/home");
  } catch {
    showToast && showToast("Gagal memuat data home");
    return;
  }

  if (!data || data.status !== "success" || !data.data) {
    showToast && showToast("Data home tidak valid");
    return;
  }

  // kumpulkan arrays dari berbagai kemungkinan struktur
  let ongoingArr = [];
  let completeArr = [];

  // struktur baru contoh: data.ongoing.animeList, data.completed.animeList
  if (data.data.ongoing && Array.isArray(data.data.ongoing.animeList)) {
    ongoingArr = data.data.ongoing.animeList;
  }
  if (data.data.completed && Array.isArray(data.data.completed.animeList)) {
    completeArr = data.data.completed.animeList;
  }

  // struktur alternate: data.ongoing / data.completed
  if (Array.isArray(data.data.ongoing) && !ongoingArr.length) {
    ongoingArr = data.data.ongoing;
  }
  if (Array.isArray(data.data.completed) && !completeArr.length) {
    completeArr = data.data.completed;
  }

  // struktur lama: data.data.ongoing_anime, data.data.complete_anime
  if (data.data.data && Array.isArray(data.data.data.ongoing_anime) && !ongoingArr.length) {
    ongoingArr = data.data.data.ongoing_anime;
  }
  if (data.data.data && Array.isArray(data.data.data.complete_anime) && !completeArr.length) {
    completeArr = data.data.data.complete_anime;
  }

  // final fallback: jika respons langsung array di data
  if (Array.isArray(data.data) && !ongoingArr.length && !completeArr.length) {
    // nothing to do, can't assume which is which
  }

  // clear
  ongoingGridHome.innerHTML = "";
  completeRowHome.innerHTML = "";

  // SEDANG TAYANG (home) – badge bawah: Eps ..
  (ongoingArr || []).slice(0, 9).forEach((a) => {
    const n = normalizeAnimeEntry(a);
    const card = createAnimeCard(n, {
      badgeTop: "Baru",
      badgeBottom: formatEpisodeLabel(n.current_episode || ""),
      meta: n.release_day || "",
    });
    ongoingGridHome.appendChild(card);
  });

  // SELESAI DITAYANGKAN (home) – pakai rating
  (completeArr || []).slice(0, 15).forEach((a) => {
    const n = normalizeAnimeEntry(a);
    const card = createAnimeCard(n, {
      rating: n.rating && n.rating !== "" ? n.rating : "N/A",
      meta: n.last_release_date || "",
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
