// assets/js/episode.js

const episodeTitleEl = document.getElementById("episodeTitle");
const episodePlayer = document.getElementById("episodePlayer");
const prevEpisodeBtn = document.getElementById("prevEpisodeBtn");
const nextEpisodeBtn = document.getElementById("nextEpisodeBtn");
const serverList = document.getElementById("serverList");

let currentEpisodeSlug = null;
let currentAnimeSlug = null;
let prevSlug = null;
let nextSlug = null;

async function loadEpisode(slug) {
  if (!episodePlayer || !episodeTitleEl || !serverList) return;

  let json;
  try {
    json = await apiGet(`/anime/episode/${slug}`);
  } catch {
    return;
  }
  if (!json || json.status !== "success") return;

  const d = json.data;
  currentEpisodeSlug = slug;
  currentAnimeSlug = (d.anime && d.anime.slug) || currentAnimeSlug;
  prevSlug = d.has_previous_episode ? d.previous_episode.slug : null;
  nextSlug = d.has_next_episode ? d.next_episode.slug : null;

  episodeTitleEl.textContent = d.episode || "Episode";
  episodePlayer.src = d.stream_url || "";

  if (prevEpisodeBtn) prevEpisodeBtn.disabled = !d.has_previous_episode;
  if (nextEpisodeBtn) nextEpisodeBtn.disabled = !d.has_next_episode;

  serverList.innerHTML = "";
  (d.stream_servers || []).forEach((group) => {
    (group.servers || []).forEach((s) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "server-button";
      btn.textContent = `${s.name} ${group.quality}`.trim();
      btn.addEventListener("click", () => {
        showToast(`Server: ${s.name}`);
        if (s.url) {
          episodePlayer.src = s.url;
        }
      });
      serverList.appendChild(btn);
    });
  });

  // update slug di URL (replaceState)
  const params = new URLSearchParams(window.location.search);
  params.set("slug", slug);
  const newUrl = `${window.location.pathname}?${params.toString()}`;
  window.history.replaceState({}, "", newUrl);
}

if (prevEpisodeBtn) {
  prevEpisodeBtn.addEventListener("click", () => {
    if (prevSlug) {
      loadEpisode(prevSlug);
    }
  });
}

if (nextEpisodeBtn) {
  nextEpisodeBtn.addEventListener("click", () => {
    if (nextSlug) {
      loadEpisode(nextSlug);
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const slug = params.get("slug");
  if (!slug) {
    showToast("Episode tidak ditemukan");
    return;
  }
  loadEpisode(slug);
});
