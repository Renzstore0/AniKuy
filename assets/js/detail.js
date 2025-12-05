// assets/js/detail.js

const animeDetailContent = document.getElementById("animeDetailContent");
const episodeList = document.getElementById("episodeList");
const recommendationGrid = document.getElementById("recommendationGrid");

const detailParams = new URLSearchParams(window.location.search);
const detailSlugFromUrl = detailParams.get("slug");

async function loadAnimeDetail(slug) {
  if (!animeDetailContent) return;

  let json;
  try {
    json = await apiGet(`/anime/anime/${slug}`);
  } catch {
    return;
  }
  if (!json || json.status !== "success") return;

  const d = json.data;
  const detailSlug = d.slug || slug;

  // wrapper kosong dulu
  animeDetailContent.innerHTML = "";

  // ================== KARTU UTAMA (DALAM BOX) ==================
  const card = document.createElement("div");
  card.className = "anime-detail-card";

  // poster
  const posterCol = document.createElement("div");
  posterCol.className = "detail-poster";
  const img = document.createElement("img");
  img.src = d.poster;
  img.alt = d.title;
  posterCol.appendChild(img);

  const metaCol = document.createElement("div");

  const titleEl = document.createElement("div");
  titleEl.className = "detail-main-title";
  titleEl.textContent = d.title;
  metaCol.appendChild(titleEl);

  if (d.japanese_title) {
    const jp = document.createElement("div");
    jp.className = "detail-sub";
    jp.textContent = d.japanese_title;
    metaCol.appendChild(jp);
  }

  const info = document.createElement("div");
  info.className = "detail-meta";
  info.innerHTML = `
    <div><span class="label">Rating:</span> ${d.rating || "N/A"}</div>
    <div><span class="label">Tipe:</span> ${d.type || "-"}</div>
    <div><span class="label">Status:</span> ${d.status || "-"}</div>
    <div><span class="label">Episode:</span> ${d.episode_count || "?"}</div>
    <div><span class="label">Rilis:</span> ${d.release_date || "-"}</div>
    <div><span class="label">Studio:</span> ${d.studio || "-"}</div>
  `;
  metaCol.appendChild(info);

  const genresWrap = document.createElement("div");
  genresWrap.className = "detail-genres";
  (d.genres || []).forEach((g) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "genre-pill";
    chip.textContent = g.name;
    chip.addEventListener("click", () => {
      if (!g.slug) return;
      const url = `/anime/genre?slug=${encodeURIComponent(
        g.slug
      )}&name=${encodeURIComponent(g.name)}`;
      window.location.href = url;
    });
    genresWrap.appendChild(chip);
  });
  metaCol.appendChild(genresWrap);

  card.appendChild(posterCol);
  card.appendChild(metaCol);

  // tempel kartu ke wrapper
  animeDetailContent.appendChild(card);

  // ================== TOMBOL PLAY + FAVORIT (DI LUAR BOX) ==================
  const actionWrap = document.createElement("div");
  actionWrap.className = "detail-actions";

  // tombol putar
  const playBtn = document.createElement("button");
  playBtn.type = "button";
  playBtn.className = "btn-play";

  const playIcon = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "svg"
  );
  playIcon.setAttribute("viewBox", "0 0 24 24");
  const playPath = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "path"
  );
  playPath.setAttribute("d", "M8 5v14l11-7z");
  playPath.setAttribute("fill", "currentColor");
  playIcon.appendChild(playPath);

  const playText = document.createElement("span");
  playText.textContent = "Putar";

  playBtn.appendChild(playIcon);
  playBtn.appendChild(playText);

  playBtn.addEventListener("click", () => {
    const eps = d.episode_lists || [];
    if (!eps.length || !eps[0].slug) return;
    const url = `/anime/episode?slug=${encodeURIComponent(eps[0].slug)}`;
    window.location.href = url;
  });

  // tombol favorit
  const favBtn = document.createElement("button");
  favBtn.type = "button";
  favBtn.className = "btn-fav";

  const favIcon = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "svg"
  );
  favIcon.setAttribute("viewBox", "0 0 24 24");
  const favPath = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "path"
  );
  favPath.setAttribute(
    "d",
    "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 6 4 4 6.5 4 8.04 4 9.54 4.81 10.35 6.09 11.16 4.81 12.66 4 14.2 4 16.7 4 18.7 6 18.7 8.5c0 3.78-3.4 6.86-8.55 11.54z"
  );
  favPath.setAttribute("fill", "currentColor");
  favIcon.appendChild(favPath);

  const favText = document.createElement("span");

  function refreshFavBtn() {
    if (isFavorite(detailSlug)) {
      favText.textContent = "Hapus dari Favorit";
    } else {
      favText.textContent = "Favorit";
    }
  }

  refreshFavBtn();
  favBtn.appendChild(favIcon);
  favBtn.appendChild(favText);

  favBtn.addEventListener("click", () => {
    const favData = {
      slug: detailSlug,
      title: d.title,
      poster: d.poster,
      rating: d.rating || "",
      episode_count: d.episode_count || "",
      status: d.status || "",
    };
    if (isFavorite(detailSlug)) {
      removeFavorite(detailSlug);
    } else {
      addFavorite(favData);
    }
    refreshFavBtn();
  });

  actionWrap.appendChild(playBtn);
  actionWrap.appendChild(favBtn);

  // tempel tombol di luar kartu
  animeDetailContent.appendChild(actionWrap);

  // ================== SINOPSIS (DI LUAR BOX JUGA) ==================
  const syn = document.createElement("p");
  syn.className = "synopsis";
  let cleanSynopsis = (d.synopsis || "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .join(" ");
  if (!cleanSynopsis) cleanSynopsis = "Tidak ada sinopsis.";
  syn.textContent = cleanSynopsis;
  animeDetailContent.appendChild(syn);

  // ================== EPISODE LIST ==================
  if (episodeList) {
    episodeList.innerHTML = "";
    (d.episode_lists || []).forEach((ep, index) => {
      const item = document.createElement("div");
      item.className = "episode-item";

      const left = document.createElement("span");
      left.textContent = `Episode ${index + 1}`;

      item.appendChild(left);

      item.addEventListener("click", () => {
        if (!ep.slug) return;
        const url = `/anime/episode?slug=${encodeURIComponent(ep.slug)}`;
        window.location.href = url;
      });

      episodeList.appendChild(item);
    });
  }

  // rekomendasi
  if (recommendationGrid) {
    recommendationGrid.innerHTML = "";
    (d.recommendations || []).forEach((a) => {
      const card = createAnimeCard(a, { meta: "" });
      recommendationGrid.appendChild(card);
    });
  }

  document.title = `AniKuy - ${d.title}`;
}

document.addEventListener("DOMContentLoaded", () => {
  if (!detailSlugFromUrl) {
    showToast("Slug anime tidak ditemukan");
    return;
  }
  loadAnimeDetail(detailSlugFromUrl);
});
