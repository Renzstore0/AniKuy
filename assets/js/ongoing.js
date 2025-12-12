const ongoingGridFull = document.getElementById("ongoingGridFull");
const ongoingPrevBtn = document.getElementById("ongoingPrevBtn");
const ongoingNextBtn = document.getElementById("ongoingNextBtn");
const ongoingPageInfo = document.getElementById("ongoingPageInfo");

let ongoingPage = 1;
let ongoingLastPage = 1;
let ongoingLoading = false;

// Sembunyikan tombol & info page, tidak pernah dipakai
if (ongoingPrevBtn) ongoingPrevBtn.style.display = "none";
if (ongoingNextBtn) ongoingNextBtn.style.display = "none";
if (ongoingPageInfo) ongoingPageInfo.style.display = "none";

// Format label episode → "Eps .."
function formatEpisodeLabel(text) {
  if (!text) return "";

  let t = String(text).trim();

  let m = t.match(/^Total\s+(\d+)\s*(Episode|Eps?)?/i);
  if (m) return `Eps ${m[1]}`;

  m = t.match(/^Episode\s+(\d+)/i);
  if (m) return `Eps ${m[1]}`;

  m = t.match(/^(\d+)\s*(Episode|Eps?)?$/i);
  if (m) return `Eps ${m[1]}`;

  return t.replace(/Episode/gi, "Eps");
}

async function loadOngoingList(page = 1, append = false) {
  if (!ongoingGridFull || ongoingLoading) return;

  ongoingLoading = true;

  let json;
  try {
    // ✅ ganti respon: recent Samehadaku
    json = await apiGet(`/anime/samehadaku/recent?page=${page}`);
  } catch {
    ongoingLoading = false;
    return;
  }
  if (!json || json.status !== "success") {
    ongoingLoading = false;
    return;
  }

  const pag = json.pagination || {};
  ongoingPage = pag.currentPage || page;
  ongoingLastPage = pag.totalPages || ongoingLastPage;

  if (!append) ongoingGridFull.innerHTML = "";

  const list = json.data && Array.isArray(json.data.animeList) ? json.data.animeList : [];

  list.forEach((a) => {
    const item = {
      title: a.title,
      poster: a.poster,
      slug: a.slug,
    };

    const card = createAnimeCard(item, {
      badgeTop: "Baru",
      badgeBottom: formatEpisodeLabel(a.episodes || ""),
      meta: a.releasedOn || "",
    });
    ongoingGridFull.appendChild(card);
  });

  ongoingLoading = false;
}

document.addEventListener("DOMContentLoaded", () => {
  loadOngoingList(1, false);

  const mainContent = document.getElementById("mainContent");
  if (!mainContent) return;

  mainContent.addEventListener("scroll", () => {
    const nearBottom =
      mainContent.scrollTop + mainContent.clientHeight >=
      mainContent.scrollHeight - 200;

    if (nearBottom && !ongoingLoading && ongoingPage < ongoingLastPage) {
      loadOngoingList(ongoingPage + 1, true);
    }
  });
});
