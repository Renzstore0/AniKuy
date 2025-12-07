// assets/js/ongoing.js

const ongoingGridFull = document.getElementById("ongoingGridFull");

let ongoingPage = 1;
let ongoingLastPage = 1;
let ongoingLoading = false;
let ongoingHasMore = true;

async function loadOngoingList(page = 1) {
  if (!ongoingGridFull) return;
  if (ongoingLoading) return;
  if (!ongoingHasMore && page !== 1) return;

  ongoingLoading = true;

  let json;
  try {
    json = await apiGet(`/anime/ongoing-anime?page=${page}`);
  } catch {
    ongoingLoading = false;
    return;
  }
  if (!json || json.status !== "success") {
    ongoingLoading = false;
    return;
  }

  const pag = json.data.paginationData;
  ongoingPage = pag.current_page;
  ongoingLastPage = pag.last_visible_page || ongoingLastPage;
  ongoingHasMore = !!pag.has_next_page;

  // page 1: bersihkan dulu
  if (ongoingPage === 1) {
    ongoingGridFull.innerHTML = "";
  }

  (json.data.ongoingAnimeData || []).forEach((a) => {
    const card = createAnimeCard(a, {
      badgeTop: a.release_day || "",
      badgeBottom: a.current_episode ? `Eps ${a.current_episode}` : "",
      meta: a.newest_release_date || "",
    });
    ongoingGridFull.appendChild(card);
  });

  ongoingLoading = false;
}

function initOngoingInfiniteScroll() {
  if (!ongoingGridFull) return;

  const scroller = document.getElementById("mainContent") || window;

  function onScroll() {
    if (ongoingLoading || !ongoingHasMore) return;

    let scrollTop, clientHeight, scrollHeight;

    if (scroller === window) {
      scrollTop =
        window.pageYOffset || document.documentElement.scrollTop || 0;
      clientHeight = window.innerHeight;
      scrollHeight =
        document.documentElement.scrollHeight || document.body.scrollHeight;
    } else {
      scrollTop = scroller.scrollTop;
      clientHeight = scroller.clientHeight;
      scrollHeight = scroller.scrollHeight;
    }

    // kalau sudah dekat bawah, load page berikutnya
    if (scrollTop + clientHeight >= scrollHeight - 300) {
      if (ongoingPage < ongoingLastPage) {
        loadOngoingList(ongoingPage + 1);
      }
    }
  }

  scroller.addEventListener("scroll", onScroll);
}

document.addEventListener("DOMContentLoaded", () => {
  if (!ongoingGridFull) return;
  loadOngoingList(1);
  initOngoingInfiniteScroll();
});
