(() => {
  "use strict";

  /* ================== utils ================== */
  const $ = (id) => document.getElementById(id);
  const toast = (m) => typeof showToast === "function" && showToast(m);
  const pick = (...v) => v.find((x) => x);

  /* ================== elements ================== */
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

  /* ================== dropdown ================== */
  const panels = [el.serverMenu, el.qualityMenu, el.downloadMenu];
  const closePanels = () => panels.forEach(p => p?.classList.remove("show"));
  const toggle = (p) => p && (p.classList.toggle("show"), panels.forEach(x => x!==p && x?.classList.remove("show")));

  document.addEventListener("click", e => {
    if (!e.target.closest(".player-toolbar") && !e.target.closest(".dropdown-panel")) closePanels();
  });

  /* ================== API helpers ================== */
  const fetchServerStream = async (serverId) => {
    try {
      const j = await apiGet(`/anime/samehadaku/server/${serverId}`);
      return pick(
        j?.data?.url,
        j?.data?.streamingUrl,
        j?.data?.embedUrl,
        j?.data?.iframeUrl
      );
    } catch {
      return "";
    }
  };

  /* ================== normalize ================== */
  const normalizeServers = (d) => {
    const out = [];
    d?.server?.qualities?.forEach(q => {
      q?.serverList?.forEach(s => {
        out.push({
          quality: q.title.trim(),
          server: s.title.trim(),
          serverId: s.serverId
        });
      });
    });
    return out;
  };

  const normalizeDownloads = (d) => {
    const out = [];
    d?.downloadUrl?.formats?.forEach(f => {
      f?.qualities?.forEach(q => {
        q?.urls?.forEach(u => {
          out.push({
            label: `${f.title} ${q.title} - ${u.title}`,
            url: u.url
          });
        });
      });
    });
    return out;
  };

  /* ================== episode chips (FIX) ================== */
  const renderChips = (list) => {
    if (!Array.isArray(list)) return;
    el.chip.innerHTML = "";

    list.forEach(item => {
      const href = item?.href;
      if (!href) return;

      const epSlug = href.split("/").pop();
      const num = (item.title.match(/\d+$/) || [""])[0];

      const b = document.createElement("button");
      b.className = "episode-chip" + (epSlug === slug ? " active" : "");
      b.textContent = num || "?";
      b.onclick = () => location.href = `/anime/episode?slug=${epSlug}`;

      el.chip.appendChild(b);
    });
  };

  /* ================== menus ================== */
  const menu = (root, title, items) => {
    root.innerHTML = `<div class="dropdown-title">${title}</div>`;
    if (!items.length) {
      root.innerHTML += `<div class="dropdown-empty">Tidak tersedia</div>`;
      return;
    }
    items.forEach(i => root.appendChild(i));
  };

  /* ================== main ================== */
  async function loadEpisode() {
    if (!slug) return toast("Slug episode tidak ditemukan");

    let json;
    try {
      json = await apiGet(`/anime/samehadaku/episode/${slug}`);
    } catch {
      return toast("Gagal memuat episode");
    }

    const d = json?.data;
    if (!d) return toast("Episode tidak ditemukan");

    /* title */
    el.title.textContent = d.title;
    document.title = `AniKuy - ${d.title}`;

    /* default player */
    el.player.src = d.defaultStreamingUrl || "";

    /* episode chips (WORK) */
    renderChips(d.recommendedEpisodeList);

    /* servers & quality (WORK) */
    const matrix = normalizeServers(d);
    let activeQuality = matrix[0]?.quality;
    let activeServer = matrix[0]?.server;

    const setPlayer = async () => {
      const row = matrix.find(x => x.quality===activeQuality && x.server===activeServer);
      if (!row) return;
      const url = await fetchServerStream(row.serverId);
      if (url) el.player.src = url;
    };

    const qualities = [...new Set(matrix.map(x => x.quality))];
    const servers = (q) => matrix.filter(x => x.quality===q).map(x => x.server);

    const renderQuality = () => {
      menu(el.qualityMenu, "Pilih Kualitas",
        qualities.map(q => {
          const b = document.createElement("button");
          b.className = "dropdown-item" + (q===activeQuality?" active":"");
          b.textContent = q;
          b.onclick = () => {
            activeQuality = q;
            activeServer = servers(q)[0];
            el.qualityLabel.textContent = q;
            el.serverLabel.textContent = activeServer;
            setPlayer();
            renderServer();
            closePanels();
          };
          return b;
        })
      );
    };

    const renderServer = () => {
      menu(el.serverMenu, "Pilih Server",
        servers(activeQuality).map(s => {
          const b = document.createElement("button");
          b.className = "dropdown-item" + (s===activeServer?" active":"");
          b.textContent = s;
          b.onclick = () => {
            activeServer = s;
            el.serverLabel.textContent = s;
            setPlayer();
            closePanels();
          };
          return b;
        })
      );
    };

    el.qualityLabel.textContent = activeQuality;
    el.serverLabel.textContent = activeServer;

    renderQuality();
    renderServer();
    setPlayer();

    /* downloads */
    const dls = normalizeDownloads(d);
    menu(el.downloadMenu, "Link Unduh",
      dls.map(x => {
        const a = document.createElement("a");
        a.className = "dropdown-item";
        a.href = x.url;
        a.target = "_blank";
        a.textContent = x.label;
        return a;
      })
    );

    /* buttons */
    el.serverBtn.onclick = () => toggle(el.serverMenu);
    el.qualityBtn.onclick = () => toggle(el.qualityMenu);
    el.downloadBtn.onclick = () => toggle(el.downloadMenu);
    el.shareBtn.onclick = () => navigator.share
      ? navigator.share({ title: document.title, url: location.href })
      : navigator.clipboard.writeText(location.href).then(() => toast("Link disalin"));
  }

  document.addEventListener("DOMContentLoaded", loadEpisode);
})();
