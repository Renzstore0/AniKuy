// assets/js/episode.js
(() => {
  "use strict";

  const id = (x) => document.getElementById(x);
  const qs = (s, r = document) => r.querySelector(s);
  const toast = (m) => typeof showToast === "function" && showToast(m);
  const pick = (...v) => v.find((x) => x != null && x !== "");

  const el = {
    title: id("episodeTitle"),
    player: id("episodePlayer"),
    chip: id("episodeChipList"),
    serverBtn: id("serverBtn"),
    qualityBtn: id("qualityBtn"),
    downloadBtn: id("downloadBtn"),
    shareBtn: id("shareBtn"),
    serverMenu: id("serverMenu"),
    qualityMenu: id("qualityMenu"),
    downloadMenu: id("downloadMenu"),
    serverLabel: id("serverLabel"),
    qualityLabel: id("qualityLabel"),
  };

  const episodeSlug = new URLSearchParams(location.search).get("slug");

  const panels = () => [el.serverMenu, el.qualityMenu, el.downloadMenu].filter(Boolean);
  const closePanels = () => panels().forEach((p) => p.classList.remove("show"));
  const togglePanel = (p) => (p && (p.classList.contains("show") ? closePanels() : (closePanels(), p.classList.add("show"))));

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".player-toolbar") && !e.target.closest(".dropdown-panel")) closePanels();
  });

  const uniq = (arr, keyFn) => {
    const s = new Set();
    return arr.filter((x) => {
      const k = keyFn(x);
      if (s.has(k)) return false;
      s.add(k);
      return true;
    });
  };

  // ============ NORMALIZER (sesuai RAW JSON kamu) ============
  // Output: [{server,quality,serverId,href}]
  const normalizeServerMatrix = (d) => {
    const q = d?.server?.qualities;
    if (!Array.isArray(q)) return [];
    const out = [];
    q.forEach((qObj) => {
      const quality = String(qObj?.title || "Auto").trim();
      (Array.isArray(qObj?.serverList) ? qObj.serverList : []).forEach((s) => {
        const server = String(s?.title || "Server").trim();
        const serverId = String(s?.serverId || "").trim();
        const href = String(s?.href || "").trim();
        if (!serverId && !href) return;
        out.push({ server, quality, serverId, href });
      });
    });
    return uniq(out, (x) => `${x.server}|${x.quality}|${x.serverId}|${x.href}`);
  };

  // downloadUrl.formats -> flatten [{label,url}]
  const normalizeDownloads = (d) => {
    const formats = d?.downloadUrl?.formats;
    if (!Array.isArray(formats)) return [];
    const out = [];
    formats.forEach((f) => {
      const fmt = String(f?.title || "").trim();
      (Array.isArray(f?.qualities) ? f.qualities : []).forEach((q) => {
        const qt = String(q?.title || "").trim();
        (Array.isArray(q?.urls) ? q.urls : []).forEach((u) => {
          const url = String(u?.url || "").trim();
          if (!url) return;
          const host = String(u?.title || "").trim();
          out.push({ label: [fmt, qt, host].filter(Boolean).join(" - "), url });
        });
      });
    });
    return uniq(out, (x) => x.url);
  };

  // Episode chips dari recommendedEpisodeList (yang di JSON kamu sudah ada)
  const epNum = (t, fb) => {
    const m = String(t || "").match(/(\d+)(?!.*\d)/);
    return m ? +m[1] : fb;
  };

  const renderChips = (list, current) => {
    if (!el.chip) return;
    el.chip.innerHTML = "";
    const wrap = el.chip.parentElement;
    if (!Array.isArray(list) || !list.length) return wrap?.classList.add("hidden");
    wrap?.classList.remove("hidden");

    const frag = document.createDocumentFragment();
    list.forEach((it, i) => {
      const s = it?.episodeId || it?.id || it?.slug;
      if (!s) return;
      const b = document.createElement("button");
      b.type = "button";
      b.className = "episode-chip" + (String(s) === String(current) ? " active" : "");
      b.textContent = String(epNum(it?.title, i + 1));
      b.onclick = () => String(s) !== String(current) && (location.href = `/anime/episode?slug=${encodeURIComponent(s)}`);
      frag.appendChild(b);
    });
    el.chip.appendChild(frag);
    qs(".episode-chip.active", el.chip)?.scrollIntoView?.({ behavior: "smooth", inline: "center", block: "nearest" });
  };

  const menuList = (root, title, empty, items) => {
    if (!root) return;
    root.innerHTML = `<div class="dropdown-title">${title}</div>`;
    if (!items.length) return (root.innerHTML += `<div class="dropdown-empty">${empty}</div>`);
    items.forEach((it) => root.appendChild(it));
  };

  const btnItem = (txt, active, onClick) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "dropdown-item" + (active ? " active" : "");
    b.textContent = txt;
    b.onclick = onClick;
    return b;
  };

  const aItem = (txt, url) => {
    const a = document.createElement("a");
    a.className = "dropdown-item";
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.textContent = txt;
    return a;
  };

  const copyText = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    toast("Link disalin!");
  };

  // resolve server endpoint (flexible)
  // coba beberapa kemungkinan: /server/{id} atau /samehadaku/server/{id}
  const resolveServerUrl = async (serverId) => {
    const paths = [
      `/anime/samehadaku/server/${encodeURIComponent(serverId)}`,
      `/anime/samehadaku/servers/${encodeURIComponent(serverId)}`,
    ];
    for (const p of paths) {
      try {
        const j = await apiGet(p);
        const d = j?.status === "success" ? j.data : null;
        const url = pick(d?.url, d?.streamingUrl, d?.defaultStreamingUrl, d?.embedUrl, d?.iframeUrl, d?.playerUrl);
        if (url) return String(url);
      } catch {}
    }
    return "";
  };

  async function loadEpisode(slug) {
    let j;
    try {
      j = await apiGet(`/anime/samehadaku/episode/${encodeURIComponent(slug)}`);
    } catch {
      return toast("Gagal memuat episode.");
    }

    const d = j?.status === "success" ? j.data : null;
    if (!d) return toast("Episode tidak ditemukan.");

    const title = String(pick(d?.title, d?.episodeTitle, d?.name, "Episode")).trim();
    if (el.title) el.title.textContent = title || "Episode";
    document.title = `AniKuy - ${title || "Episode"}`;

    // ✅ FIX UTAMA: fallback ke defaultStreamingUrl
    const startUrl = pick(
      d?.embedUrl, d?.embed_url, d?.iframe, d?.iframeUrl, d?.playerUrl, d?.streamUrl, d?.videoUrl, d?.url,
      d?.defaultStreamingUrl, d?.default_streaming_url
    );

    if (el.player) {
      if (startUrl) el.player.src = String(startUrl);
      else toast("Player tidak tersedia.");
    }

    // downloads
    const dl = normalizeDownloads(d);
    menuList(el.downloadMenu, "Link Unduh", "Link unduh tidak tersedia", dl.map((x) => aItem(x.label, x.url)));

    // chips (pakai recommendedEpisodeList yg ada di JSON kamu)
    renderChips(d?.recommendedEpisodeList || [], slug);

    // server/quality dari server.qualities
    const matrix = normalizeServerMatrix(d);

    let activeServer = matrix[0]?.server || "Auto";
    let activeQuality = matrix[0]?.quality || "Auto";

    const servers = () => [...new Set(matrix.map((x) => x.server))];
    const qualities = (srv) => [...new Set(matrix.filter((x) => x.server === srv).map((x) => x.quality))];

    const updateLabels = () => {
      if (el.serverLabel) el.serverLabel.textContent = activeServer || "Auto";
      if (el.qualityLabel) el.qualityLabel.textContent = activeQuality || "Auto";
    };

    const applySelection = async (srv, ql) => {
      const pickRow =
        matrix.find((x) => x.server === srv && x.quality === ql) ||
        matrix.find((x) => x.server === srv) ||
        matrix[0];

      if (!pickRow) return;

      activeServer = pickRow.server;
      activeQuality = pickRow.quality;
      updateLabels();

      // set player dari serverId kalau ada, fallback tetap aman
      const u = pickRow.serverId ? await resolveServerUrl(pickRow.serverId) : "";
      if (u && el.player) el.player.src = u;

      renderMenus();
    };

    const renderMenus = () => {
      if (!matrix.length) {
        updateLabels();
        menuList(el.serverMenu, "Pilih Server", "Server tidak tersedia", []);
        menuList(el.qualityMenu, "Pilih Kualitas", "Kualitas tidak tersedia", []);
        return;
      }

      menuList(
        el.serverMenu,
        "Pilih Server",
        "Server tidak tersedia",
        servers().map((s) => btnItem(s, s === activeServer, () => {
          const q = qualities(s)[0] || "Auto";
          applySelection(s, q);
          closePanels();
        }))
      );

      menuList(
        el.qualityMenu,
        "Pilih Kualitas",
        "Kualitas tidak tersedia",
        qualities(activeServer).map((q) => btnItem(q, q === activeQuality, () => {
          applySelection(activeServer, q);
          closePanels();
        }))
      );
    };

    renderMenus();
    updateLabels();

    // buttons (bind sekali)
    el.serverBtn && (el.serverBtn.onclick = () => togglePanel(el.serverMenu));
    el.qualityBtn && (el.qualityBtn.onclick = () => togglePanel(el.qualityMenu));
    el.downloadBtn && (el.downloadBtn.onclick = () => togglePanel(el.downloadMenu));

    el.shareBtn && (el.shareBtn.onclick = async () => {
      closePanels();
      const url = location.href;
      if (navigator.share) {
        try { await navigator.share({ title: document.title, url }); return; } catch {}
      }
      copyText(url);
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (!episodeSlug) return toast("Slug episode tidak ditemukan");
    loadEpisode(episodeSlug);
  });
})();
