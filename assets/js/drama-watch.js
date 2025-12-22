(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const toast = (m) => typeof showToast === "function" && showToast(m);

  const p = new URLSearchParams(location.search);
  const bookId = p.get("bookId");
  const chapterId = p.get("chapterId");
  const name = p.get("name") || "";

  const el = {
    title: $("dramaWatchTitle"),
    player: $("dramaPlayer"),
    qualityBtn: $("dramaQualityBtn"),
    qualityMenu: $("dramaQualityMenu"),
    qualityLabel: $("dramaQualityLabel"),
    shareBtn: $("dramaShareBtn"),
    chip: $("dramaEpisodeChipList"),
  };

  const closePanels = () => el.qualityMenu?.classList.remove("show");
  const togglePanel = () => el.qualityMenu?.classList.toggle("show");

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".player-toolbar") && !e.target.closest(".dropdown-panel")) closePanels();
  });

  const getSavedEpisodes = () => {
    try {
      if (!bookId) return null;
      const raw = sessionStorage.getItem(`dramabox_eps_${bookId}`);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  const epNum = (t, idx) => {
    const s = String(t || "");
    const m = s.match(/(\d+)/);
    return m ? parseInt(m[1], 10) : idx + 1;
  };

  const pickCdn = (ep) => {
    const cdn = (ep?.cdnList || []).find((c) => c?.isDefault === 1) || (ep?.cdnList || [])[0];
    return cdn || null;
  };

  const buildQualityList = (ep) => {
    const cdn = pickCdn(ep);
    const list = cdn?.videoPathList || [];
    return list
      .filter((x) => x?.videoPath)
      .map((x) => ({
        q: x.quality ? `${x.quality}p` : "Auto",
        qNum: x.quality || 0,
        url: x.videoPath,
        isDefault: x.isDefault === 1,
      }))
      .sort((a, b) => (b.qNum - a.qNum) || (b.isDefault - a.isDefault));
  };

  const setPlayer = (url) => {
    if (!el.player) return;
    el.player.src = url || "";
    el.player.load();
    // autoplay kalau browser ngizinin
    el.player.play?.().catch(() => {});
  };

  const renderQuality = (qualities, activeUrl) => {
    if (!el.qualityMenu) return;

    el.qualityMenu.innerHTML = `<div class="dropdown-title">Pilih Kualitas</div>`;
    if (!qualities.length) {
      el.qualityMenu.innerHTML += `<div class="dropdown-empty">Tidak tersedia</div>`;
      return;
    }

    qualities.forEach((it) => {
      const b = document.createElement("button");
      b.className = "dropdown-item" + (it.url === activeUrl ? " active" : "");
      b.textContent = it.q;
      b.onclick = () => {
        el.qualityLabel && (el.qualityLabel.textContent = it.q);
        setPlayer(it.url);
        renderQuality(qualities, it.url);
        closePanels();
      };
      el.qualityMenu.appendChild(b);
    });
  };

  const renderChips = (eps) => {
    if (!el.chip || !Array.isArray(eps)) return;
    el.chip.innerHTML = "";

    const sorted = eps.slice().sort((a, b) => (a.chapterIndex ?? 0) - (b.chapterIndex ?? 0));

    sorted.forEach((ep, idx) => {
      const b = document.createElement("button");
      const n = epNum(ep.chapterName, idx);

      b.type = "button";
      b.className = "episode-chip" + (String(ep.chapterId) === String(chapterId) ? " active" : "");
      b.textContent = String(n);

      b.onclick = () => {
        if (!ep?.chapterId) return;
        location.href = `/drama/watch?bookId=${encodeURIComponent(bookId)}&chapterId=${encodeURIComponent(
          ep.chapterId
        )}&name=${encodeURIComponent(name)}`;
      };

      el.chip.appendChild(b);
    });

    el.chip.querySelector(".episode-chip.active")?.scrollIntoView?.({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  };

  async function load() {
    if (!bookId || !chapterId) return toast("Parameter bookId/chapterId tidak lengkap");

    // judul
    el.title && (el.title.textContent = name ? `Nonton • ${name}` : "Nonton Drama");

    // ambil episode list (coba dari sessionStorage dulu)
    let eps = getSavedEpisodes();
    if (!Array.isArray(eps) || !eps.length) {
      try {
        eps = await apiGetDrama(`/api/dramabox/allepisode?bookId=${encodeURIComponent(bookId)}`);
      } catch {
        return;
      }
    }

    if (!Array.isArray(eps) || !eps.length) return toast("Episode tidak ditemukan");

    renderChips(eps);

    const ep = eps.find((x) => String(x.chapterId) === String(chapterId));
    if (!ep) return toast("Chapter tidak ditemukan");

    const qualities = buildQualityList(ep);
    if (!qualities.length) return toast("Link video tidak tersedia");

    const active = qualities.find((x) => x.isDefault) || qualities[0];
    el.qualityLabel && (el.qualityLabel.textContent = active.q);
    setPlayer(active.url);
    renderQuality(qualities, active.url);

    el.qualityBtn && (el.qualityBtn.onclick = () => togglePanel());

    el.shareBtn &&
      (el.shareBtn.onclick = () =>
        navigator.share
          ? navigator.share({ title: document.title, url: location.href })
          : navigator.clipboard
              .writeText(location.href)
              .then(() => toast("Link disalin"))
              .catch(() => toast("Gagal menyalin link")));
  }

  document.addEventListener("DOMContentLoaded", load);
})();
