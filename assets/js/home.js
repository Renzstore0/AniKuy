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

// ---------- UTIL ----------
function getTodayName() {
  const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  return days[new Date().getDay()];
}

function cleanUrl(s) {
  if (!s) return "";
  // some data included like "[https://...]" — hapus bracket jika ada
  return String(s).replace(/^\[|\]$/g, "").trim();
}

// --- FORMAT LABEL EPISODE (dipakai Home & Ongoing) ---
function formatEpisodeLabel(text) {
  if (!text) return "";
  let t = String(text).trim();

  // common: "Total 10 Episode" / "Total 10 Eps"
  let m = t.match(/^Total\s+(\d+)\s*(Episode|Eps?)?/i);
  if (m) return `Eps ${m[1]}`;

  // "Episode 10"
  m = t.match(/^Episode\s+(\d+)/i);
  if (m) return `Eps ${m[1]}`;

  // "10 Episode" / "10 Eps" / "10"
  m = t.match(/^(\d+)\s*(Episode|Eps?)?$/i);
  if (m) return `Eps ${m[1]}`;

  // sometimes field just "episodes": "10" or "15"
  m = t.match(/^(\d+)$/i);
  if (m) return `Eps ${m[1]}`;

  // fallback: ganti kata Episode → Eps
  return t.replace(/Episode/gi, "Eps");
}

// ---------- TODAY HERO ----------
function scrollTodayDotsIntoView() {
  if (!todayDots) return;
  const active = todayDots.querySelector("span.active");
  if (!active) return;

  const wrapRect = todayDots.getBoundingClientRect();
  const dotRect = active.getBoundingClientRect();
  const offset = dotRect.left - wrapRect.left - wrapRect.width / 2 + dotRect.width / 2;

  todayDots.scrollBy({ left: offset, behavior: "smooth" });
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
  todayPoster.src = cleanUrl(current.poster || "");
  todayPoster.alt = current.title || "";
  todayTitle.textContent = current.title || "";

  // poster sebelum
  if (todayPosterPrev && prev) {
    todayPosterPrev.src = cleanUrl(prev.poster || "");
    todayPosterPrev.alt = prev.title || "";
  }

  // poster sesudah
  if (todayPosterNext && next) {
    todayPosterNext.src = cleanUrl(next.poster || "");
    todayPosterNext.alt = next.title || "";
  }

  // dots
  todayDots.innerHTML = "";
  todayAnimeList.forEach((_, i) => {
    const dot = document.createElement("span");
    if (i === todayIndex) dot.classList.add("active");
    todayDots.appendChild(dot);
  });

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
  if (!current) return;
  // prefer slug, fallback to animeId or href
  const slug = current.slug || current.animeId || "";
  if (slug) {
    const url = `/anime/detail?slug=${encodeURIComponent(slug)}`;
    window.location.href = url;
    return;
  }
  if (current.href) {
    window.location.href = current.href;
  }
}

function goTodayStep(delta, fromUser = true) {
  if (!todayAnimeList.length) return;
  const len = todayAnimeList.length;
  todayIndex = (todayIndex + delta + len) % len;
  updateTodayHero();
  if (fromUser) restartTodayAuto();
}

/**
 * loadTodayAnime:
 * - pertama coba /anime/schedule (struktur lama)
 * - jika gagal atau tidak ada schedule, fallback ke /anime/home dan gunakan recent.animeList
 */
async function loadTodayAnime() {
  if (!todaySection) return;

  // coba ambil dari endpoint schedule dulu
  try {
    const sched = await apiGet("/anime/schedule");
    if (sched && sched.status === "success" && Array.isArray(sched.data)) {
      // cari hari sekarang
      const todayName = getTodayName();
      const todayObj = sched.data.find((d) => d.day === todayName);
      if (todayObj && Array.isArray(todayObj.anime_list) && todayObj.anime_list.length) {
        todayAnimeList = todayObj.anime_list.map((a) => ({
          title: a.anime_name || a.title,
          poster: cleanUrl(a.poster || a.image || ""),
          slug: a.slug || a.animeId || "",
          animeId: a.animeId || "",
          href: a.href || "",
        }));
      }
    }
  } catch (e) {
    // ignore, kita akan fallback ke home result
  }

  // fallback: jika belum ada data, ambil dari /anime/home -> recent.animeList
  if (!todayAnimeList.length) {
    try {
      const home = await apiGet("/anime/home");
      if (home && home.status === "success" && home.data) {
        // raw JSON yang kamu kirim punya struktur: data.recent.animeList
        const recent = home.data.recent && Array.isArray(home.data.recent.animeList) ? home.data.recent.animeList : null;
        if (recent && recent.length) {
          todayAnimeList = recent.map((a) => ({
            title: a.title || a.anime_name,
            poster: cleanUrl(a.poster || a.image || ""),
            slug: a.animeId || a.slug || "",
            animeId: a.animeId || "",
            href: a.href || "",
          }));
        }
      }
    } catch (e) {
      // ignore
    }
  }

  if (!todayAnimeList.length) return;

  // tampilkan section
  todaySection.style.display = "block";
  if (todayHeaderTitle) {
    todayHeaderTitle.textContent = `Anime Rilis Hari Ini - ${getTodayName()}`;
  }

  todayIndex = 0;
  updateTodayHero();
  restartTodayAuto();

  // event tombol
  if (todayWatchBtn) todayWatchBtn.addEventListener("click", goToTodayDetail);
  if (todayPoster) todayPoster.addEventListener("click", goToTodayDetail);

  if (todayPosterPrev) todayPosterPrev.addEventListener("click", () => goTodayStep(-1, true));
  if (todayPosterNext) todayPosterNext.addEventListener("click", () => goTodayStep(1, true));
  if (todayPrevBtn) todayPrevBtn.addEventListener("click", () => goTodayStep(-1, true));
  if (todayNextBtn) todayNextBtn.addEventListener("click", () => goTodayStep(1, true));
}

// --- HOME (SEDANG TAYANG & SELESAI) ---
/**
 * loadHome:
 * - mendukung struktur lama (ongoing_anime / complete_anime)
 * - juga mendukung struktur Raw JSON yang berisi recent/movie/top10
 * mapping yang dipakai:
 *   ongoing <- ongoing_anime || recent.animeList
 *   complete <- complete_anime || movie.animeList || top10.animeList
 */
async function loadHome() {
  if (!ongoingGridHome || !completeRowHome) return;

  let data;
  try {
    data = await apiGet("/anime/home");
  } catch (e) {
    console.error("Failed to fetch /anime/home", e);
    return;
  }

  if (!data || data.status !== "success" || !data.data) {
    showToast("Data home tidak valid");
    return;
  }

  const raw = data.data;

  // extract ongoing
  let ongoing = [];
  if (Array.isArray(raw.ongoing_anime)) ongoing = raw.ongoing_anime;
  else if (raw.recent && Array.isArray(raw.recent.animeList)) ongoing = raw.recent.animeList;
  else if (Array.isArray(raw.ongoing)) ongoing = raw.ongoing;

  // extract complete
  let complete = [];
  if (Array.isArray(raw.complete_anime)) complete = raw.complete_anime;
  else if (raw.movie && Array.isArray(raw.movie.animeList)) complete = raw.movie.animeList;
  else if (raw.top10 && Array.isArray(raw.top10.animeList)) complete = raw.top10.animeList;
  else if (Array.isArray(raw.complete)) complete = raw.complete;

  // normalize helpers (card creation expects certain props)
  function normalizeCardData(a) {
    return {
      title: a.title || a.anime_name || a.animeId || "",
      poster: cleanUrl(a.poster || a.image || a.thumb || ""),
      slug: a.slug || a.animeId || "",
      current_episode: a.current_episode || a.episodes || a.episodes_count || "",
      release_day: a.release_day || a.releasedOn || a.last_release_date || "",
      rating: a.rating || a.score || a.score_value || "",
      href: a.href || "",
    };
  }

  ongoingGridHome.innerHTML = "";
  completeRowHome.innerHTML = "";

  // SEDANG TAYANG (home) – badge bawah: Eps ..
  (ongoing.slice(0, 9) || []).forEach((a) => {
    const norm = normalizeCardData(a);
    const card = createAnimeCard(norm, {
      badgeTop: "Baru",
      badgeBottom: formatEpisodeLabel(norm.current_episode || ""),
      meta: norm.release_day || "",
    });
    ongoingGridHome.appendChild(card);
  });

  // SELESAI DITAYANGKAN (home) – pakai rating
  (complete.slice(0, 15) || []).forEach((a) => {
    const norm = normalizeCardData(a);
    const card = createAnimeCard(norm, {
      rating: norm.rating && String(norm.rating) !== "" ? norm.rating : "N/A",
      meta: norm.release_day || "",
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

/* --- catatan:
 - file ini mengasumsikan fungsi global `apiGet(url)` ada dan mengembalikan JSON parsed.
 - juga mengasumsikan fungsi `createAnimeCard(data, opts)` ada di scope global untuk membuat elemen card.
 - fungsi `showToast(msg)` diasumsikan tersedia untuk notifikasi.
 - code ini tahan banting terhadap struktur JSON lama maupun struktur Raw JSON yang kamu kirim.
*/
