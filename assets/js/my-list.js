const myListGrid = document.getElementById("myListGrid");
const myListEmpty = document.getElementById("myListEmpty");

function renderMyListPage() {
  if (!myListGrid || !myListEmpty) return;

  const favs = getFavorites();
  const historyMap =
    typeof getWatchHistory === "function" ? getWatchHistory() : {};

  myListGrid.innerHTML = "";

  if (!favs.length) {
    myListEmpty.style.display = "block";
    return;
  }

  myListEmpty.style.display = "none";

  favs.forEach((a) => {
    const card = createAnimeCard(a, {
      rating: a.rating || "",
      badgeBottom: a.episode_count ? `${a.episode_count} Eps` : "",
      meta: a.status || "",
    });

    if (card) {
      // pastikan card bisa dipakai untuk posisi tombol history
      if (!card.style.position) {
        card.style.position = "relative";
      }

      const historyForAnime =
        historyMap && a.slug ? historyMap[a.slug] : null;

      // tombol history / lanjut nonton
      const historyBtn = document.createElement("button");
      historyBtn.type = "button";
      historyBtn.className = "icon-button history-button";
      historyBtn.setAttribute("aria-label", "Lanjut nonton");

      const svgNS = "http://www.w3.org/2000/svg";
      const icon = document.createElementNS(svgNS, "svg");
      icon.setAttribute("viewBox", "0 0 24 24");
      icon.classList.add("icon-svg");

      const path = document.createElementNS(svgNS, "path");
      path.setAttribute(
        "d",
        "M12 2a10 10 0 1 0 10 10A10.011 10.011 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8.009 8.009 0 0 1-8 8zm.5-13h-1.5v6l5 3 .75-1.23-4.25-2.52z"
      );
      path.setAttribute("fill", "currentColor");
      icon.appendChild(path);
      historyBtn.appendChild(icon);

      // posisi tombol history (pojok kanan bawah kartu)
      historyBtn.style.position = "absolute";
      historyBtn.style.right = "8px";
      historyBtn.style.bottom = "8px";

      if (!historyForAnime || !historyForAnime.episodeSlug) {
        historyBtn.disabled = true;
        historyBtn.title = "Belum ada riwayat nonton";
      } else {
        const pos = historyForAnime.positionSec || 0;
        const minutes = Math.floor(pos / 60);
        const seconds = pos % 60;
        const timeLabel =
          pos > 0
            ? ` (${minutes.toString().padStart(2, "0")}:${seconds
                .toString()
                .padStart(2, "0")})`
            : "";
        historyBtn.title =
          "Lanjut: " +
          (historyForAnime.episodeTitle || "Episode terakhir ditonton") +
          timeLabel;
      }

      historyBtn.addEventListener("click", (ev) => {
        ev.stopPropagation();
        if (!historyForAnime || !historyForAnime.episodeSlug) {
          showToast("Belum ada riwayat nonton");
          return;
        }
        const url = `/anime/episode?slug=${encodeURIComponent(
          historyForAnime.episodeSlug
        )}`;
        window.location.href = url;
      });

      card.appendChild(historyBtn);
    }

    myListGrid.appendChild(card);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  renderMyListPage();
});
