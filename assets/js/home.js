(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const toast = (m) => typeof showToast === "function" && showToast(m);

  const el = {
    ongoing: $("ongoingGridHome"),
    movieRow: $("completeRowHome"),
    btnAllOngoing: $("seeAllOngoingBtn"),
    btnAllMovie: $("seeAllCompleteBtn"),
    movieTitle: $("completeSectionTitle"),

    todaySec: $("todaySection"),
    todayHdr: $("todayHeaderTitle"),
    prevImg: $("todayPosterPrev"),
    curImg: $("todayPoster"),
    nextImg: $("todayPosterNext"),
    todayTitle: $("todayTitle"),
    dots: $("todayDots"),
    watch: $("todayWatchBtn"),
    prevBtn: $("todayPrevBtn"),
    nextBtn: $("todayNextBtn"),
  };

  // ===== helpers =====
  const dayID = () => ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"][new Date().getDay()];
  const dayEN = () => ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][new Date().getDay()];
  const toID = (d) => ({monday:"Senin",tuesday:"Selasa",wednesday:"Rabu",thursday:"Kamis",friday:"Jumat",saturday:"Sabtu",sunday:"Minggu"}[String(d||"").trim().toLowerCase()] || d || "-");
  const slugFromHref = (h) => (String(h || "").trim().split("/").filter(Boolean).pop() || "");
  const poster = (u) => (String(u || "").trim() ? u : "/assets/img/placeholder-poster.png");

  const epsLabel = (t) => {
    t = String(t ?? "").trim();
    let m = t.match(/^Total\s+(\d+)\s*(Episode|Eps?)?/i) || t.match(/^Episode\s+(\d+)/i) || t.match(/^(\d+)\s*(Episode|Eps?)?$/i);
    return m ? `Eps ${m[1]}` : t.replace(/Episode/gi, "Eps");
  };

  // ===== Today Hero =====
  let todayList = [], idx = 0, timer = null;
  const AUTO_MS = 7000;

  const dotCenter = () => {
    if (!el.dots) return;
    const a = el.dots.querySelector("span.active");
    if (!a) return;
    const w = el.dots.getBoundingClientRect(), d = a.getBoundingClientRect();
    el.dots.scrollBy({ left: d.left - w.left - w.width / 2 + d.width / 2, behavior: "smooth" });
  };

  const renderHero = () => {
    if (!el.todaySec || !el.curImg || !el.todayTitle || !el.dots || !todayList.length) return;
    const cur = todayList[idx], len = todayList.length;
    const prev = todayList[(idx - 1 + len) % len], next = todayList[(idx + 1) % len];

    el.curImg.src = poster(cur.poster); el.curImg.alt = cur.title || "";
    el.todayTitle.textContent = cur.title || "-";

    if (el.prevImg && prev) { el.prevImg.src = poster(prev.poster); el.prevImg.alt = prev.title || ""; }
    if (el.nextImg && next) { el.nextImg.src = poster(next.poster); el.nextImg.alt = next.title || ""; }

    el.dots.innerHTML = "";
    for (let i = 0; i < len; i++) {
      const s = document.createElement("span");
      if (i === idx) s.classList.add("active");
      el.dots.appendChild(s);
    }
    dotCenter();
  };

  const stepHero = (d, user = true) => {
    if (!todayList.length) return;
    idx = (idx + d + todayList.length) % todayList.length;
    renderHero();
    if (user) startAuto();
  };

  const gotoDetail = () => {
    const cur = todayList[idx];
    if (cur?.slug) location.href = `/anime/detail?slug=${encodeURIComponent(cur.slug)}`;
  };

  const startAuto = () => {
    clearInterval(timer);
    if (!todayList.length) return;
    timer = setInterval(() => stepHero(1, false), AUTO_MS);
  };

  async function loadToday() {
    if (!el.todaySec) return;

    let json = null;
    try { json = await apiGet("/anime/samehadaku/schedule"); }
    catch { try { json = await apiGet("/anime/schedule"); } catch {} }

    if (!json || json.status !== "success") return;

    const indo = dayID(), eng = dayEN();
    const daysNew = Array.isArray(json.data?.days) ? json.data.days : null;
    const daysOld = Array.isArray(json.data) ? json.data : null;

    let list = [];
    if (daysNew) {
      const o =
        daysNew.find((d) => String(d.day || "").toLowerCase() === eng.toLowerCase()) ||
        daysNew.find((d) => toID(d.day) === indo);
      list = (o?.animeList || []).map((a) => ({
        title: a.title || "-",
        poster: a.poster || "",
        slug: a.animeId || slugFromHref(a.href) || "",
      }));
    } else if (daysOld) {
      const o = daysOld.find((d) => String(d.day || "") === indo);
      list = (o?.anime_list || []).map((a) => ({
        title: a.anime_name || "-",
        poster: a.poster || "",
        slug: a.slug || "",
      }));
    }

    todayList = list.filter((x) => x?.slug);
    if (!todayList.length) return (el.todaySec.style.display = "none");

    el.todaySec.style.display = "block";
    if (el.todayHdr) el.todayHdr.textContent = `Anime Rilis Hari Ini - ${indo}`;
    idx = 0;
    renderHero();
    startAuto();

    el.watch?.addEventListener("click", gotoDetail);
    el.curImg?.addEventListener("click", gotoDetail);
    el.prevImg?.addEventListener("click", () => stepHero(-1, true));
    el.nextImg?.addEventListener("click", () => stepHero(1, true));
    el.prevBtn?.addEventListener("click", () => stepHero(-1, true));
    el.nextBtn?.addEventListener("click", () => stepHero(1, true));
  }

  // ===== Home (Recent + Movies) =====
  async function loadHome() {
    if (!el.ongoing || !el.movieRow) return;
    if (el.movieTitle) el.movieTitle.textContent = "Movie";

    let home;
    try { home = await apiGet("/anime/samehadaku/home"); } catch { return; }
    if (!home?.data || home.status !== "success") return toast("Data home tidak valid");

    el.ongoing.innerHTML = "";
    (home.data?.recent?.animeList || []).slice(0, 9).forEach((a) => {
      el.ongoing.appendChild(
        createAnimeCard(
          { title: a.title || "-", poster: a.poster || "", slug: a.animeId || a.slug || "", animeId: a.animeId },
          { badgeTop: "Baru", badgeBottom: epsLabel(a.episodes || ""), meta: a.releasedOn || "" }
        )
      );
    });

    let mv = null;
    try { mv = await apiGet("/anime/samehadaku/movies"); } catch {}
    const movies = mv?.status === "success" ? mv.data?.animeList || [] : [];

    el.movieRow.innerHTML = "";
    movies.slice(0, 15).forEach((a) => {
      el.movieRow.appendChild(
        createAnimeCard(
          { title: a.title || "-", poster: a.poster || "", slug: a.animeId || slugFromHref(a.href) || "", animeId: a.animeId },
          { rating: a.score ? String(a.score) : "N/A", meta: a.releaseDate || a.status || "" }
        )
      );
    });
  }

  // ===== buttons =====
  el.btnAllOngoing?.addEventListener("click", () => (location.href = "/anime/ongoing"));
  el.btnAllMovie?.addEventListener("click", () => (location.href = "/anime/movies"));

  // ===== init =====
  document.addEventListener("DOMContentLoaded", () => {
    loadHome();
    loadToday();
  });
})();
