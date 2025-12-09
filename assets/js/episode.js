const episodeTitleEl = document.getElementById("episodeTitle");
const episodePlayer = document.getElementById("episodePlayer");
const prevEpisodeBtn = document.getElementById("prevEpisodeBtn");
const nextEpisodeBtn = document.getElementById("nextEpisodeBtn");

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

let currentEpisodeSlug = null;
let currentAnimeSlug = null;
let prevSlug = null;
let nextSlug = null;

// data toolbar
let streamGroups = []; // [{ quality, servers: [] }]
let downloadData = null; // d.download_urls
let selectedQuality = null;
let selectedServerName = null;

// ---------------- UTIL ----------------

// normalisasi group stream: pastikan ada field quality
function normalizeStreamGroups(raw) {
  return (raw || []).map((g) => {
    const servers = g.servers || [];
    let quality = g.quality || "";

    if (!quality && servers.length) {
      const sample =
        servers[0].quality || servers[0].label || servers[0].id || "";
      const m = String(sample).match(/(\d{3,4}p)/i);
      if (m) quality = m[1];
    }

    if (!quality) quality = "Auto";

    return {
      quality,
      servers,
    };
  });
}

// resolve url server (bisa langsung url, atau lewat endpoint id)
async function resolveServerUrl(server) {
  if (!server) return null;
  if (server.url) return server.url;
  if (server.embed_url) return server.embed_url;
  if (server.link) return server.link;

  if (server.id) {
    try {
      const res = await apiGet(server.id); // contoh: "/anime/server/188041-0-360p"
      if (!res) return null;
      const d = res.data || res;
      return d.stream_url || d.url || d.embed_url || null;
    } catch (e) {
      return null;
    }
  }

  return null;
}

// tutup semua dropdown
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

// set stream berdasarkan quality + server
async function setStreamSource(targetQuality, targetServerName) {
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

  let server = null;

  if (targetServerName) {
    server = (group.servers || []).find((s) => s.name === targetServerName);
  }

  if (!server) {
    server = (group.servers || [])[0];
  }

  if (!server) return;

  const url = await resolveServerUrl(server);
  if (!url) {
    showToast("Gagal memuat server");
    return;
  }

  episodePlayer.src = url;

  selectedQuality = group.quality || null;
  selectedServerName = server.name || null;
  updateToolbarLabels();
}

// update label tombol
function updateToolbarLabels() {
  if (serverLabelEl) {
    if (selectedServerName) {
      serverLabelEl.textContent = selectedQuality
        ? `${selectedServerName} ${selectedQuality}`
        : selectedServerName;
    } else {
      serverLabelEl.textContent = "Auto";
    }
  }
  if (qualityLabelEl) {
    qualityLabelEl.textContent = selectedQuality || "Auto";
  }
}

// ---------------- DROPDOWN RENDER ----------------

// semua server (nama + kualitas)
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

  const title = document.createElement("div");
  title.className = "dropdown-title";
  title.textContent = "Pilih Server";
  serverMenu.appendChild(title);

  streamGroups.forEach((g) => {
    const qLabel = g.quality || "Auto";
    (g.servers || []).forEach((s) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "dropdown-item";

      if (selectedServerName === s.name && selectedQuality === qLabel) {
        btn.classList.add("active");
      }

      btn.textContent = `${s.name || "Server"} ${qLabel}`.trim();
      btn.addEventListener("click", () => {
        setStreamSource(qLabel, s.name || null);
        closeAllDropdowns();
        showToast(`Server: ${s.name || "Server"} ${qLabel}`);
      });

      serverMenu.appendChild(btn);
    });
  });
}

// list kualitas streaming
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
  title.textContent = "Pilih Kualitas Streaming";
  qualityMenu.appendChild(title);

  const qualities = [];
  streamGroups.forEach((g) => {
    if (!qualities.includes(g.quality)) qualities.push(g.quality);
  });

  qualities.forEach((q) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "dropdown-item";
    if (selectedQuality === q) btn.classList.add("active");
    btn.textContent = q || "Auto";
    btn.addEventListener("click", () => {
      setStreamSource(q || null, null);
      closeAllDropdowns();
      showToast(`Kualitas: ${q || "Auto"}`);
    });
    qualityMenu.appendChild(btn);
  });
}

// list kualitas download (mp4 + mkv)
function renderDownloadMenu() {
  if (!downloadMenu) return;
  downloadMenu.innerHTML = "";

  if (!downloadData) {
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

  const types = Object.keys(downloadData); // mp4, mkv, dll

  types.forEach((ext, idx) => {
    const items = downloadData[ext] || [];
    if (!items.length) return;

    const header = document.createElement("div");
    header.className = "dropdown-subtitle";
    header.textContent = ext.toUpperCase();
    if (idx > 0) header.style.marginTop = "6px";
    downloadMenu.appendChild(header);

    items.forEach((item) => {
      const res = item.resolution || "Auto";
      (item.urls || []).forEach((u) => {
        if (!u || !u.url) return;
        const link = document.createElement("a");
        link.className = "dropdown-item";
        link.href = u.url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.download = "";

        const provider = u.provider || "Server";
        link.textContent = `${res} - ${provider}`;
        downloadMenu.appendChild(link);
      });
    });
  });

  if (downloadMenu.children.length === 1) {
    // cuma title
    const empty = document.createElement("div");
    empty.className = "dropdown-empty";
    empty.textContent = "Link unduhan belum tersedia";
    downloadMenu.appendChild(empty);
  }
}

// BAGIKAN: share link episode saat ini
function handleShare() {
  const slug = currentEpisodeSlug;
  const baseUrl = `${window.location.origin}${window.location.pathname}`;
  const shareUrl = slug ? `${baseUrl}?slug=${slug}` : window.location.href;

  const title =
    document.title ||
    (episodeTitleEl && episodeTitleEl.textContent) ||
    "AniKuy";
  const text = "Tonton episode anime di AniKuy";

  if (navigator.share) {
    navigator
      .share({
        title,
        text,
        url: shareUrl,
      })
      .catch(() => {});
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
    window.prompt("Salin link episode:", shareUrl);
  }
}

// ---------------- LOAD EPISODE ----------------

async function loadEpisode(slug) {
  if (!episodePlayer || !episodeTitleEl) return;

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

  // set target custom untuk tombol back → selalu balik ke halaman detail anime
  const backButton = document.getElementById("backButton");
  if (backButton && currentAnimeSlug) {
    backButton.dataset.href = `/anime/detail?slug=${encodeURIComponent(
      currentAnimeSlug
    )}`;
  }

  episodeTitleEl.textContent = d.episode || "Episode";

  // stream default
  if (d.stream_url) {
    episodePlayer.src = d.stream_url;
  }

  // normalisasi data stream & download
  streamGroups = normalizeStreamGroups(d.stream_servers || []);
  downloadData = d.download_urls || null;

  // set default quality + server (tanpa fetch lagi)
  if (streamGroups.length && streamGroups[0].servers.length) {
    selectedQuality = streamGroups[0].quality || null;
    selectedServerName = streamGroups[0].servers[0].name || null;
  } else {
    selectedQuality = null;
    selectedServerName = null;
  }

  updateToolbarLabels();

  if (prevEpisodeBtn) prevEpisodeBtn.disabled = !d.has_previous_episode;
  if (nextEpisodeBtn) nextEpisodeBtn.disabled = !d.has_next_episode;

  // render UI
  renderServerMenu();
  renderQualityMenu();
  renderDownloadMenu();

  // tracking riwayat tonton + auto-resume (hanya jalan kalau #episodePlayer adalah <video>)
  if (typeof setupWatchProgressTracking === "function") {
    setupWatchProgressTracking({
      animeSlug: currentAnimeSlug,
      animeTitle: d.anime && d.anime.title,
      animePoster: d.anime && d.anime.poster,
      episodeSlug: slug,
      episodeTitle: d.episode || "",
    });
  }

  if (typeof applyResumeTimeForEpisode === "function") {
    applyResumeTimeForEpisode(slug);
  }

  // update slug di URL (replaceState)
  const params = new URLSearchParams(window.location.search);
  params.set("slug", slug);
  const newUrl = `${window.location.pathname}?${params.toString()}`;
  window.history.replaceState({}, "", newUrl);
}

// ---------------- EVENT LISTENER ----------------

// prev/next episode
if (prevEpisodeBtn) {
  prevEpisodeBtn.addEventListener("click", () => {
    if (prevSlug) loadEpisode(prevSlug);
  });
}

if (nextEpisodeBtn) {
  nextEpisodeBtn.addEventListener("click", () => {
    if (nextSlug) loadEpisode(nextSlug);
  });
}

// toolbar
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
    if (!downloadData) {
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

// initial load
document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const slug = params.get("slug");
  if (!slug) {
    showToast("Episode tidak ditemukan");
    return;
  }
  loadEpisode(slug);
});
