// assets/js/episode.js

const episodeTitleEl = document.getElementById("episodeTitle");
const episodePlayer = document.getElementById("episodePlayer");
const prevEpisodeBtn = document.getElementById("prevEpisodeBtn");
const nextEpisodeBtn = document.getElementById("nextEpisodeBtn");
const serverList = document.getElementById("serverList");

// toolbar buttons
const serverBtn = document.getElementById("serverBtn");
const qualityBtn = document.getElementById("qualityBtn");
const downloadBtn = document.getElementById("downloadBtn");
const shareBtn = document.getElementById("shareBtn");

// toolbar labels
const serverLabelEl = document.getElementById("serverLabel");
const qualityLabelEl = document.getElementById("qualityLabel");

// dropdown panels
const serverMenu = document.getElementById("serverMenu");
const qualityMenu = document.getElementById("qualityMenu");
const downloadMenu = document.getElementById("downloadMenu");

// episode chips
const episodeChipList = document.getElementById("episodeChipList");

let currentEpisodeSlug = null;
let currentAnimeSlug = null;
let prevSlug = null;
let nextSlug = null;

// data untuk toolbar
let streamGroups = [];
let downloadGroups = [];
let selectedQuality = null;
let selectedServerName = null;

// util: tutup semua dropdown
function closeAllDropdowns() {
  if (serverMenu) serverMenu.classList.remove("show");
  if (qualityMenu) qualityMenu.classList.remove("show");
  if (downloadMenu) downloadMenu.classList.remove("show");
}

// klik di luar dropdown => tutup
document.addEventListener("click", (e) => {
  const container = document.getElementById("playerDropdownContainer");
  if (!container) return;
  if (!container.contains(e.target) && !e.target.closest(".toolbar-btn")) {
    closeAllDropdowns();
  }
});

// render list server di bawah (legacy)
function renderServerList(d) {
  if (!serverList) return;
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
          selectedQuality = group.quality || null;
          selectedServerName = s.name || null;
          updateToolbarLabels();
        }
      });
      serverList.appendChild(btn);
    });
  });
}

// set src stream berdasarkan quality + server
function setStreamSource(targetQuality, targetServerName) {
  if (!episodePlayer) return;
  if (!streamGroups || !streamGroups.length) return;

  const qualityToUse =
    targetQuality ||
    selectedQuality ||
    (streamGroups[0] && streamGroups[0].quality) ||
    null;

  const group =
    streamGroups.find((g) => g.quality === qualityToUse) || streamGroups[0];

  if (!group) return;

  let server;

  if (targetServerName) {
    server = (group.servers || []).find((s) => s.name === targetServerName);
  }

  if (!server) {
    server = (group.servers || [])[0];
  }

  if (!server || !server.url) return;

  selectedQuality = group.quality || null;
  selectedServerName = server.name || null;

  episodePlayer.src = server.url;
  updateToolbarLabels();
}

// toolbar label
function updateToolbarLabels() {
  if (serverLabelEl) {
    serverLabelEl.textContent = selectedServerName || "Auto";
  }
  if (qualityLabelEl) {
    qualityLabelEl.textContent = selectedQuality || "Auto";
  }
}

// dropdown: server
function renderServerMenu() {
  if (!serverMenu) return;
  serverMenu.innerHTML = "";

  if (!streamGroups || !streamGroups.length) {
    const empty = document.createElement("div");
    empty.className = "dropdown-empty";
    empty.textContent = "Server tidak tersedia";
    serverMenu.appendChild(empty);
    return;
  }

  const currentQ =
    selectedQuality ||
    (streamGroups[0] && streamGroups[0].quality) ||
    null;
  const group =
    streamGroups.find((g) => g.quality === currentQ) || streamGroups[0];

  const title = document.createElement("div");
  title.className = "dropdown-title";
  title.textContent = group.quality
    ? `Server (${group.quality})`
    : "Server Streaming";
  serverMenu.appendChild(title);

  (group.servers || []).forEach((s) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "dropdown-item";
    if (selectedServerName === s.name) {
      btn.classList.add("active");
    }
    btn.textContent = s.name || "Server";
    btn.addEventListener("click", () => {
      setStreamSource(group.quality || null, s.name || null);
      closeAllDropdowns();
      showToast(`Server: ${s.name}`);
    });
    serverMenu.appendChild(btn);
  });
}

// dropdown: kualitas
function renderQualityMenu() {
  if (!qualityMenu) return;
  qualityMenu.innerHTML = "";

  if (!streamGroups || !streamGroups.length) {
    const empty = document.createElement("div");
    empty.className = "dropdown-empty";
    empty.textContent = "Kualitas tidak tersedia";
    qualityMenu.appendChild(empty);
    return;
  }

  const title = document.createElement("div");
  title.className = "dropdown-title";
  title.textContent = "Pilih Kualitas";
  qualityMenu.appendChild(title);

  streamGroups.forEach((g) => {
    const label = g.quality || "Auto";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "dropdown-item";
    if (selectedQuality === g.quality) {
      btn.classList.add("active");
    }
    btn.textContent = label;
    btn.addEventListener("click", () => {
      setStreamSource(g.quality || null, null);
      closeAllDropdowns();
      showToast(`Kualitas: ${label}`);
    });
    qualityMenu.appendChild(btn);
  });
}

// dropdown: unduhan
function renderDownloadMenu() {
  if (!downloadMenu) return;
  downloadMenu.innerHTML = "";

  if (!downloadGroups || !downloadGroups.length) {
    const empty = document.createElement("div");
    empty.className = "dropdown-empty";
    empty.textContent = "Link unduhan belum tersedia";
    downloadMenu.appendChild(empty);
    return;
  }

  const title = document.createElement("div");
  title.className = "dropdown-title";
  title.textContent = "Unduh berdasarkan kualitas";
  downloadMenu.appendChild(title);

  downloadGroups.forEach((g) => {
    const quality = g.quality || "Auto";
    (g.servers || []).forEach((s) => {
      const url = s.download_url || s.url;
      if (!url) return;

      const link = document.createElement("a");
      link.className = "dropdown-item";
      link.href = url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.download = "";

      link.textContent = `${quality} - ${s.name || "Server"}`;
      downloadMenu.appendChild(link);
    });
  });
}

// episode chips (4,5,6,...)
function renderEpisodeChips(d) {
  if (!episodeChipList) return;

  const episodes =
    d.episode_list ||
    d.episodes ||
    (d.anime && (d.anime.episodes || d.anime.episode_list)) ||
    [];

  episodeChipList.innerHTML = "";

  if (!episodes || !episodes.length) {
    episodeChipList.parentElement.style.display = "none";
    return;
  }

  episodeChipList.parentElement.style.display = "";

  episodes.forEach((ep) => {
    if (!ep || !ep.slug) return;
    const num = ep.episode || ep.number || ep.name || "?";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "episode-chip";
    if (ep.slug === currentEpisodeSlug) {
      btn.classList.add("active");
    }
    btn.textContent = num;

    btn.addEventListener("click", () => {
      if (ep.slug === currentEpisodeSlug) return;
      loadEpisode(ep.slug);
    });

    episodeChipList.appendChild(btn);
  });
}

// BAGIKAN
function handleShare() {
  const slug = currentEpisodeSlug;
  const baseUrl = `${window.location.origin}${window.location.pathname}`;
  const shareUrl = slug ? `${baseUrl}?slug=${slug}` : window.location.href;

  const title = document.title || episodeTitleEl?.textContent || "AniKuy";
  const text = "Tonton episode anime di AniKuy";

  if (navigator.share) {
    navigator
      .share({
        title,
        text,
        url: shareUrl,
      })
      .catch(() => {
        // kalau user cancel, diam saja
      });
  } else if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(shareUrl).then(
      () => {
        showToast("Link episode disalin");
      },
      () => {
        showToast("Gagal menyalin link");
      }
    );
  } else {
    // fallback terakhir
    window.prompt("Salin link episode:", shareUrl);
  }
}

async function loadEpisode(slug) {
  if (!episodePlayer || !episodeTitleEl || !serverList) return;

  let json;
  try {
    json = await apiGet(`/anime/episode/${slug}`);
  } catch {
    showToast("Gagal memuat episode");
    return;
  }
  if (!json || json.status !== "success") {
    showToast("Episode tidak ditemukan");
    return;
  }

  const d = json.data;
  currentEpisodeSlug = slug;
  currentAnimeSlug = (d.anime && d.anime.slug) || currentAnimeSlug;
  prevSlug = d.has_previous_episode ? d.previous_episode.slug : null;
  nextSlug = d.has_next_episode ? d.next_episode.slug : null;

  episodeTitleEl.textContent = d.episode || "Episode";
  episodePlayer.src = d.stream_url || "";

  // data untuk toolbar
  streamGroups = d.stream_servers || [];
  downloadGroups = d.download_servers || d.stream_servers || [];

  // reset pilihan default
  selectedQuality =
    (d.default_quality && d.default_quality) ||
    (streamGroups[0] && streamGroups[0].quality) ||
    null;

  selectedServerName =
    streamGroups[0] && streamGroups[0].servers && streamGroups[0].servers[0]
      ? streamGroups[0].servers[0].name || null
      : null;

  updateToolbarLabels();

  if (prevEpisodeBtn) prevEpisodeBtn.disabled = !d.has_previous_episode;
  if (nextEpisodeBtn) nextEpisodeBtn.disabled = !d.has_next_episode;

  // render UI
  renderServerList(d);
  renderServerMenu();
  renderQualityMenu();
  renderDownloadMenu();
  renderEpisodeChips(d);

  // update slug di URL (replaceState)
  const params = new URLSearchParams(window.location.search);
  params.set("slug", slug);
  const newUrl = `${window.location.pathname}?${params.toString()}`;
  window.history.replaceState({}, "", newUrl);
}

// tombol prev/next
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

// toolbar clicks
if (serverBtn) {
  serverBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (!streamGroups || !streamGroups.length) return;
    renderServerMenu();
    const isOpen = serverMenu.classList.contains("show");
    closeAllDropdowns();
    if (!isOpen) serverMenu.classList.add("show");
  });
}

if (qualityBtn) {
  qualityBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (!streamGroups || !streamGroups.length) return;
    renderQualityMenu();
    const isOpen = qualityMenu.classList.contains("show");
    closeAllDropdowns();
    if (!isOpen) qualityMenu.classList.add("show");
  });
}

if (downloadBtn) {
  downloadBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (!downloadGroups || !downloadGroups.length) {
      showToast("Link unduhan belum tersedia");
      return;
    }
    renderDownloadMenu();
    const isOpen = downloadMenu.classList.contains("show");
    closeAllDropdowns();
    if (!isOpen) downloadMenu.classList.add("show");
  });
}

if (shareBtn) {
  shareBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    handleShare();
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
