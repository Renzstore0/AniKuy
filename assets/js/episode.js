// assets/js/episode.js

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
let streamGroups = []; // [{ quality, servers: [{name, id, href, url?}] }]
let downloadData = null; // d.downloadUrl.formats
let selectedQuality = null;
let selectedServerName = null;

// ---------------- UTIL ----------------

function samehadakuApiPathFromHref(href) {
  // API route kamu konsisten: "/anime" + href
  // contoh href: "/samehadaku/server/XXXX" -> "/anime/samehadaku/server/XXXX"
  if (!href) return null;
  const h = String(href).trim();
  if (!h.startsWith("/")) return null;
  return `/anime${h}`;
}

function cleanServerName(title, quality) {
  if (!title) return "Server";
  let t = String(title).trim();

  // buang kualitas di ujung (misal: "Blogspot 360p")
  if (quality) {
    const q = String(quality).trim();
    t = t.replace(new RegExp(`\\s*${q}\\s*$`, "i"), "").trim();
  }

  // buang pola 360p/480p/720p/1080p/4k di ujung
  t = t.replace(/\s*(\d{3,4}p|4k)\s*$/i, "").trim();

  return t || "Server";
}

function normalizeStreamGroupsFromSamehadaku(serverObj) {
  const qualities = serverObj && Array.isArray(serverObj.qualities) ? serverObj.qualities : [];
  const groups = [];

  qualities.forEach((q) => {
    const qLabel = (q && q.title ? String(q.title).trim() : "") || "Auto";
    const serversRaw = q && Array.isArray(q.serverList) ? q.serverList : [];

    const servers = serversRaw
      .map((s) => {
        const name = cleanServerName(s && s.title, qLabel);
        const id = s && s.serverId ? String(s.serverId).trim() : null;
        const href = s && s.href ? String(s.href).trim() : null;
        return { name, id, href };
      })
      .filter((s) => s && (s.id || s.href));

    // skip group yang kosong
    if (servers.length) {
      groups.push({
        quality: qLabel || "Auto",
        servers,
      });
    }
  });

  return groups;
}

// resolve url server dari href/id
async function resolveServerUrl(server) {
  if (!server) return null;

  // kalau nanti API langsung kasih url
  if (server.url) return server.url;
  if (server.embed_url) return server.embed_url;
  if (server.link) return server.link;

  // prioritas href (karena raw JSON ada href)
  const pathFromHref = samehadakuApiPathFromHref(server.href);
  if (pathFromHref) {
    try {
      const res = await apiGet(pathFromHref);
      const d = (res && res.data) ? res.data : res;

      return (
        d?.stream_url ||
        d?.streamUrl ||
        d?.streamingUrl ||
        d?.url ||
        d?.embed_url ||
        d?.embedUrl ||
        d?.defaultStreamingUrl ||
        null
      );
    } catch {
      // lanjut coba by id
    }
  }

  // fallback: by serverId (kalau kamu punya endpoint /anime/samehadaku/server/{id})
  if (server.id) {
    try {
      const res = await apiGet(`/anime/samehadaku/server/${encodeURIComponent(server.id)}`);
      const d = (res && res.data) ? res.data : res;
      return (
        d?.stream_url ||
        d?.streamUrl ||
        d?.streamingUrl ||
        d?.url ||
        d?.embed_url ||
        d?.embedUrl ||
        d?.defaultStreamingUrl ||
        null
      );
    } catch {
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
    if (typeof showToast === "function") showToast("Gagal memuat server");
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
        if (typeof showToast === "function") showToast(`Server: ${s.name || "Server"} ${qLabel}`);
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
      if (typeof showToast === "function") showToast(`Kualitas: ${q || "Auto"}`);
    });
    qualityMenu.appendChild(btn);
  });
}

// list kualitas download (berdasarkan downloadUrl.formats)
function renderDownloadMenu() {
  if (!downloadMenu) return;
  downloadMenu.innerHTML = "";

  const formats = Array.isArray(downloadData) ? downloadData : null;

  if (!formats || !formats.length) {
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

  formats.forEach((fmt, idx) => {
    const fmtTitle = fmt && fmt.title ? String(fmt.title).trim() : "";
    const qualities = fmt && Array.isArray(fmt.qualities) ? fmt.qualities : [];
    if (!qualities.length) return;

    const header = document.createElement("div");
    header.className = "dropdown-subtitle";
    header.textContent = fmtTitle || "Format";
    if (idx > 0) header.style.marginTop = "6px";
    downloadMenu.appendChild(header);

    qualities.forEach((q) => {
      const qTitle = q && q.title ? String(q.title).trim() : "Auto";
      const urls = q && Array.isArray(q.urls) ? q.urls : [];
      urls.forEach((u) => {
        const url = u && u.url ? String(u.url).trim() : "";
        if (!url) return;

        const link = document.createElement("a");
        link.className = "dropdown-item";
        link.href = url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.download = "";

        const provider = u && u.title ? String(u.title).trim() : "Server";
        link.textContent = `${qTitle} - ${provider}`.trim();

        downloadMenu.appendChild(link);
      });
    });
  });

  if (downloadMenu.children.length === 1) {
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
    navigator.share({ title, text, url: shareUrl }).catch(() => {});
  } else if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(shareUrl).then(
      () => {
        if (typeof showToast === "function") showToast("Link episode disalin");
      },
      () => {
        if (typeof showToast === "function") showToast("Gagal menyalin link");
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
    // ✅ endpoint baru
    json = await apiGet(`/anime/samehadaku/episode/${encodeURIComponent(slug)}`);
  } catch {
    if (typeof showToast === "function") showToast("Gagal memuat episode");
    return;
  }

  if (!json || json.status !== "success" || !json.data) {
    if (typeof showToast === "function") showToast("Episode tidak ditemukan");
    return;
  }

  const d = json.data;

  currentEpisodeSlug = slug;
  currentAnimeSlug = d.animeId || currentAnimeSlug;

  prevSlug = d.hasPrevEpisode && d.prevEpisode ? d.prevEpisode.episodeId : null;
  nextSlug = d.hasNextEpisode && d.nextEpisode ? d.nextEpisode.episodeId : null;

  // tombol back -> balik ke detail anime (pakai animeId)
  const backButton = document.getElementById("backButton");
  if (backButton && currentAnimeSlug) {
    backButton.dataset.href = `/anime/detail?slug=${encodeURIComponent(currentAnimeSlug)}`;
  }

  // judul episode
  episodeTitleEl.textContent = d.title || "Episode";

  // stream default
  if (d.defaultStreamingUrl) {
    episodePlayer.src = d.defaultStreamingUrl;
  } else {
    episodePlayer.removeAttribute("src");
  }

  // normalisasi data stream & download sesuai struktur baru
  streamGroups = normalizeStreamGroupsFromSamehadaku(d.server || {});
  downloadData = (d.downloadUrl && Array.isArray(d.downloadUrl.formats)) ? d.downloadUrl.formats : null;

  // set default quality + server (tanpa fetch lagi)
  if (streamGroups.length && streamGroups[0].servers.length) {
    selectedQuality = streamGroups[0].quality || null;
    selectedServerName = streamGroups[0].servers[0].name || null;
  } else {
    selectedQuality = null;
    selectedServerName = null;
  }

  updateToolbarLabels();

  if (prevEpisodeBtn) prevEpisodeBtn.disabled = !prevSlug;
  if (nextEpisodeBtn) nextEpisodeBtn.disabled = !nextSlug;

  // render UI
  renderServerMenu();
  renderQualityMenu();
  renderDownloadMenu();

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
      if (typeof showToast === "function") showToast("Link unduhan belum tersedia");
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
    if (typeof showToast === "function") showToast("Episode tidak ditemukan");
    return;
  }
  loadEpisode(slug);
});
