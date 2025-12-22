const API_BASE = "https://dramabox.sansekai.my.id/api/dramabox";

const qs = new URLSearchParams(location.search);
const bookId = qs.get("bookId");

const el = (id) => document.getElementById(id);

function pickBestVideoPath(chapter) {
  const cdn = (chapter.cdnList || []).find(c => c.isDefault === 1) || (chapter.cdnList || [])[0];
  if (!cdn) return "";

  const list = cdn.videoPathList || [];
  const def = list.find(v => v.isDefault === 1) || list.find(v => v.quality === 720) || list[0];
  return def?.videoPath || "";
}

async function fetchJSON(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function initBack() {
  el("backButton").addEventListener("click", () =>
    history.length > 1 ? history.back() : (location.href = "/drama-china/")
  );
}

async function init() {
  initBack();

  if (!bookId) {
    el("episodeList").innerHTML = `<div class="profile-text">bookId kosong.</div>`;
    return;
  }

  try {
    const data = await fetchJSON(`${API_BASE}/allepisode?bookId=${encodeURIComponent(bookId)}`);
    const listEl = el("episodeList");
    const player = el("videoPlayer");

    if (!Array.isArray(data) || data.length === 0) {
      listEl.innerHTML = `<div class="profile-text">Episode kosong.</div>`;
      return;
    }

    const playChapter = (ch) => {
      const src = pickBestVideoPath(ch);
      if (!src) return;
      player.src = src;
      player.play().catch(()=>{});
    };

    data.forEach((ch) => {
      const item = document.createElement("div");
      item.className = "episode-item";
      item.innerHTML = `<span>${ch.chapterName || `EP ${ch.chapterIndex + 1}`}</span><span>▶</span>`;
      item.addEventListener("click", () => playChapter(ch));
      listEl.appendChild(item);
    });

    playChapter(data[0]);
  } catch (err) {
    el("episodeList").innerHTML = `<div class="profile-text">Gagal load episode. (${err.message})</div>`;
  }
}

init();
