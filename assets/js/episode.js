(() => {
  "use strict";

  /* ===== utils ===== */
  const $ = (id) => document.getElementById(id);
  const pick = (...v) => v.find(Boolean);
  const toast = (m) => typeof showToast === "function" && showToast(m);

  /* ===== elements ===== */
  const el = {
    title: $("episodeTitle"),
    player: $("episodePlayer"),
    chip: $("episodeChipList"),
    serverMenu: $("serverMenu"),
    qualityMenu: $("qualityMenu"),
    downloadMenu: $("downloadMenu"),
    serverBtn: $("serverBtn"),
    qualityBtn: $("qualityBtn"),
    downloadBtn: $("downloadBtn"),
    shareBtn: $("shareBtn"),
    serverLabel: $("serverLabel"),
    qualityLabel: $("qualityLabel"),
  };

  const slug = new URLSearchParams(location.search).get("slug");

  /* ===== dropdown ===== */
  const panels = [el.serverMenu, el.qualityMenu, el.downloadMenu].filter(Boolean);
  const closePanels = () => panels.forEach((p) => p.classList.remove("show"));
  const toggle = (p) => {
    if (!p) return;
    const on = !p.classList.contains("show");
    closePanels();
    p.classList.toggle("show", on);
  };
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".player-toolbar") && !e.target.closest(".dropdown-panel")) closePanels();
  });

  /* ===== API ===== */
  const fetchServerStream = async (serverId) => {
    try {
      const j = await apiGet(`/anime/samehadaku/server/${serverId}`);
      return pick(j?.data?.url, j?.data?.streamingUrl, j?.data?.embedUrl, j?.data?.iframeUrl) || "";
    } catch {
      return "";
    }
  };

  /* ===== normalize ===== */
  const normalizeServers = (d) =>
    (d?.server?.qualities || []).flatMap((q) =>
      (q?.serverList || []).map((s) => ({
        quality: String(q?.title || "").trim(),
        server: String(s?.title || "").trim(),
        serverId: s?.serverId,
      }))
    );

  const normalizeDownloads = (d) =>
    (d?.downloadUrl?.formats || []).flatMap((f) =>
      (f?.qualities || []).flatMap((q) =>
        (q?.urls || []).map((u) => ({
          label: `${f.title} ${q.title} - ${u.title}`,
          url: u.url,
        }))
      )
    );

  /* ===== episode chips (sorted) ===== */
  const renderChips = (list) => {
    if (!Array.isArray(list) || !el.chip) return;
    el.chip.innerHTML = "";

    const items = list
      .map((item) => {
        const href = item?.href;
        if (!href) return null;
        const epSlug = href.split("/").filter(Boolean).pop();
        const num = parseInt((String(item?.title || "").match(/\d+$/) || ["0"])[0], 10);
        return { epSlug, num };
      })
      .filter(Boolean)
      .sort((a, b) => a.num - b.num);

    for (const { epSlug, num } of items) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "episode-chip" + (epSlug === slug ? " active" : "");
      b.textContent = num || "?";
      b.onclick = () => epSlug === slug || (location.href = `/anime/episode?slug=${epSlug}`);
      el.chip.appendChild(b);
    }

    el.chip.querySelector(".episode-chip.active")?.scrollIntoView?.({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  };

  /* ===== menus ===== */
  const menu = (root, title, nodes) => {
    if (!root) return;
    root.innerHTML = `<div class="dropdown-title">${title}</div>`;
    if (!nodes.length) return (root.innerHTML += `<div class="dropdown-empty">Tidak tersedia</div>`);
    nodes.forEach((n) => root.appendChild(n));
  };

  /* ===== main ===== */
  const loadEpisode = async () => {
    if (!slug) return toast("Slug episode tidak ditemukan");

    let j;
    try {
      j = await apiGet(`/anime/samehadaku/episode/${slug}`);
    } catch {
      return toast("Gagal memuat episode");
    }

    const d = j?.data;
    if (!d) return toast("Episode tidak ditemukan");

    el.title && (el.title.textContent = d.title || "Episode");
    document.title = `AniKuy - ${d.title || "Episode"}`;
    el.player && (el.player.src = d.defaultStreamingUrl || "");

    renderChips(d.recommendedEpisodeList);

    const matrix = normalizeServers(d);
    if (!matrix.length) {
      el.qualityLabel && (el.qualityLabel.textContent = "Auto");
      el.serverLabel && (el.serverLabel.textContent = "Auto");
      menu(el.qualityMenu, "Pilih Kualitas", []);
      menu(el.serverMenu, "Pilih Server", []);
    } else {
      let activeQuality = matrix[0].quality;
      let activeServer = matrix[0].server;

      const qualities = [...new Set(matrix.map((x) => x.quality))];
      const serversOf = (q) => matrix.filter((x) => x.quality === q).map((x) => x.server);

      const setPlayer = async () => {
        const row = matrix.find((x) => x.quality === activeQuality && x.server === activeServer);
        if (!row) return;
        const url = await fetchServerStream(row.serverId);
        url && el.player && (el.player.src = url);
      };

      const renderQuality = () =>
        menu(
          el.qualityMenu,
          "Pilih Kualitas",
          qualities.map((q) => {
            const b = document.createElement("button");
            b.className = "dropdown-item" + (q === activeQuality ? " active" : "");
            b.textContent = q;
            b.onclick = () => {
              activeQuality = q;
              activeServer = serversOf(q)[0] || activeServer;
              el.qualityLabel && (el.qualityLabel.textContent = activeQuality);
              el.serverLabel && (el.serverLabel.textContent = activeServer);
              renderServer();
              setPlayer();
              closePanels();
            };
            return b;
          })
        );

      const renderServer = () =>
        menu(
          el.serverMenu,
          "Pilih Server",
          serversOf(activeQuality).map((s) => {
            const b = document.createElement("button");
            b.className = "dropdown-item" + (s === activeServer ? " active" : "");
            b.textContent = s;
            b.onclick = () => {
              activeServer = s;
              el.serverLabel && (el.serverLabel.textContent = activeServer);
              setPlayer();
              closePanels();
            };
            return b;
          })
        );

      el.qualityLabel && (el.qualityLabel.textContent = activeQuality);
      el.serverLabel && (el.serverLabel.textContent = activeServer);
      renderQuality();
      renderServer();
      setPlayer();
    }

    const dls = normalizeDownloads(d);
    menu(
      el.downloadMenu,
      "Link Unduh",
      dls.map((x) => {
        const a = document.createElement("a");
        a.className = "dropdown-item";
        a.href = x.url;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.textContent = x.label;
        return a;
      })
    );

    el.serverBtn && (el.serverBtn.onclick = () => toggle(el.serverMenu));
    el.qualityBtn && (el.qualityBtn.onclick = () => toggle(el.qualityMenu));
    el.downloadBtn && (el.downloadBtn.onclick = () => toggle(el.downloadMenu));
    el.shareBtn &&
      (el.shareBtn.onclick = () =>
        navigator.share
          ? navigator.share({ title: document.title, url: location.href })
          : navigator.clipboard
              .writeText(location.href)
              .then(() => toast("Link disalin"))
              .catch(() => toast("Gagal menyalin link")));
  };

  document.addEventListener("DOMContentLoaded", loadEpisode);
})();
