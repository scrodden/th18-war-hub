/* TH18 War Hub — light interactivity, no dependencies */
(function () {
  "use strict";

  // Mobile nav toggle
  var toggle = document.querySelector(".nav-toggle");
  var links = document.querySelector(".nav-links");
  if (toggle && links) {
    toggle.addEventListener("click", function () {
      links.classList.toggle("open");
    });
    links.addEventListener("click", function (e) {
      if (e.target.tagName === "A") links.classList.remove("open");
    });
  }

  // Copy-link buttons (copy the clash link to clipboard for desktop users)
  var toast = document.getElementById("toast");
  var toastTimer = null;
  function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove("show"); }, 2200);
  }

  document.querySelectorAll("[data-copy]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var text = btn.getAttribute("data-copy");
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(
          function () { showToast("Link copied — paste it on your phone with Clash open"); },
          function () { showToast("Couldn't copy automatically — long-press the link instead"); }
        );
      } else {
        // Fallback
        var ta = document.createElement("textarea");
        ta.value = text; document.body.appendChild(ta); ta.select();
        try { document.execCommand("copy"); showToast("Link copied to clipboard"); }
        catch (e) { showToast("Couldn't copy — long-press the link instead"); }
        document.body.removeChild(ta);
      }
    });
  });

  // Highlight current section in nav on scroll (attacks page)
  var sectionLinks = document.querySelectorAll(".subnav a[href^='#']");
  if (sectionLinks.length) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var id = entry.target.getAttribute("id");
          sectionLinks.forEach(function (a) {
            a.classList.toggle("active", a.getAttribute("href") === "#" + id);
          });
        }
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    document.querySelectorAll(".strat[id]").forEach(function (s) { observer.observe(s); });
  }
})();

/* ---- Per-base design schematics on the defenses page ---- */
(function () {
  "use strict";
  var thumbs = document.querySelectorAll(".base-thumb[data-arch]");
  if (!thumbs.length) return;

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function schematic(o) {
    var x0 = 30, y0 = 15, W = 200, H = 150;
    var rings = parseInt(o.rings, 10) || 3;
    var air = o.air === "1";
    var maze = o.maze === "1";
    var traps = o.traps === "1";
    var splashN = parseInt(o.splash, 10) || 2;

    var s = '<svg viewBox="0 0 260 180" class="thumb-svg" role="img" aria-label="Schematic of a ' +
      esc(o.arch) + ' base layout">';

    for (var i = 0; i < rings; i++) {
      var ix = i * 26, iy = i * 20;
      var fill = i === 0 ? "#201d29" : (i === rings - 1 ? "#2c2738" : "#262232");
      s += '<rect x="' + (x0 + ix) + '" y="' + (y0 + iy) + '" width="' + (W - 2 * ix) +
        '" height="' + (H - 2 * iy) + '" rx="14" fill="' + fill + '" stroke="#3a3448" stroke-width="2"/>';
    }
    if (maze) {
      s += '<line x1="130" y1="' + y0 + '" x2="130" y2="' + (y0 + H) + '" stroke="#322e40" stroke-width="1.5"/>';
      s += '<line x1="' + x0 + '" y1="90" x2="' + (x0 + W) + '" y2="90" stroke="#322e40" stroke-width="1.5"/>';
      s += '<line x1="80" y1="35" x2="80" y2="145" stroke="#322e40" stroke-width="1"/>';
      s += '<line x1="180" y1="35" x2="180" y2="145" stroke="#322e40" stroke-width="1"/>';
    }
    // Multi-Gear Tower near core
    s += '<rect x="124" y="55" width="12" height="12" rx="2" fill="#f5b942"/>';
    // splash defenses
    var splash = [[104, 66], [156, 66], [104, 114], [156, 114]].slice(0, splashN);
    splash.forEach(function (p) {
      s += '<rect x="' + (p[0] - 6) + '" y="' + (p[1] - 6) + '" width="12" height="12" rx="2" fill="#ff6b35"/>';
    });
    // air defenses
    var ad = air ? [[74, 50], [186, 50], [74, 130], [186, 130]] : [[92, 58], [168, 122]];
    ad.forEach(function (p) { s += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="5" fill="#4cc9f0"/>'; });
    // Town Hall (drawn last so it's on top)
    s += '<rect x="117" y="77" width="26" height="26" rx="6" fill="#3a2a12" stroke="#f5b942" stroke-width="2.5"/>';
    s += '<text x="130" y="95" text-anchor="middle" style="font:700 10px sans-serif" fill="#f5b942">TH</text>';
    // traps
    if (traps) {
      [[55, 38], [205, 38], [55, 142], [205, 142]].forEach(function (p) {
        s += '<path d="M' + (p[0] - 5) + ' ' + (p[1] - 5) + ' l10 10 M' + (p[0] + 5) + ' ' + (p[1] - 5) +
          ' l-10 10" stroke="#ff6b6b" stroke-width="2"/>';
      });
    }
    s += '<text x="130" y="173" text-anchor="middle" style="font:600 10px sans-serif" fill="#a6a1b8">' +
      esc(o.arch) + "</text>";
    s += "</svg>";
    return s;
  }

  thumbs.forEach(function (el) {
    el.insertAdjacentHTML("afterbegin", schematic(el.dataset));
  });
})();

/* ---- "Fresh this week" feed (populated by the weekly GitHub Actions bot) ---- */
(function () {
  "use strict";
  var armyEl = document.getElementById("fresh-armies");
  var baseEl = document.getElementById("fresh-bases");
  var proArmyEl = document.getElementById("pro-armies");
  var proBaseEl = document.getElementById("pro-bases");
  if (!armyEl && !baseEl) return;

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function isNew(firstSeen) {
    if (!firstSeen) return false;
    var d = new Date(firstSeen + "T00:00:00Z");
    return !isNaN(d) && (Date.now() - d.getTime()) < 8 * 864e5; // within 8 days
  }
  function badges(it) {
    var b = "";
    if (it.pro) b += '<span class="tag-pro">PRO</span>';
    if (isNew(it.first_seen)) b += '<span class="tag-new">NEW</span>';
    return b ? '<span class="badges">' + b + "</span>" : "";
  }

  function baseLabel(it) {
    var t = (it.type || "").toUpperCase();
    var kind = t === "HV" ? "Home / Trophy" : (t === "WB" ? "War / CWL" : "Layout");
    return (it.th ? "TH" + it.th + " " : "") + kind;
  }

  var LIMIT = 12;

  function itemHtml(it, kind) {
    if (kind === "army") {
      var head = it.head || "Copy army";
      var sub = it.spells ? '<span class="sub">🧪 ' + esc(it.spells) + "</span>" : "";
      var tip = it.comp ? ' title="' + esc(it.comp) + '"' : "";
      return '<a class="fresh-item army" href="' + esc(it.url) + '" rel="nofollow"' + tip + ">" +
        '<span class="ic">⚔️</span>' +
        '<span class="txt"><span class="head">' + esc(head) + "</span>" + sub +
        '<span class="src">' + esc(it.source || "") + "</span></span>" +
        badges(it) + "</a>";
    }
    return '<a class="fresh-item" href="' + esc(it.url) + '" rel="nofollow">' +
      '<span class="ic">🛡️</span>' +
      '<span class="txt">' + esc(baseLabel(it)) +
      '<span class="src">' + esc(it.source || "") + "</span></span>" +
      badges(it) + "</a>";
  }

  function renderList(el, items, kind) {
    if (!el) return;
    if (!items || !items.length) {
      el.innerHTML = '<p class="fresh-empty">No links yet — check back after the next Tuesday refresh.</p>';
      return;
    }
    el.innerHTML = items.slice(0, LIMIT).map(function (it) { return itemHtml(it, kind); }).join("");
    if (items.length > LIMIT) {
      var more = document.createElement("p");
      more.className = "fresh-more";
      more.textContent = "+ " + (items.length - LIMIT) + " more in the weekly feed.";
      el.after(more);
    }
  }

  function split(items) {
    items = items || [];
    return { pro: items.filter(function (x) { return x.pro; }),
             rest: items.filter(function (x) { return !x.pro; }) };
  }
  function hideBlockIfEmpty(el, n) {
    var block = el && el.closest("[data-pro-block]");
    if (block && !n) block.style.display = "none";
  }

  fetch("data/latest.json", { cache: "no-store" })
    .then(function (r) { if (!r.ok) throw new Error("no data"); return r.json(); })
    .then(function (data) {
      var d = (data.updated || "").slice(0, 10);
      document.querySelectorAll("[data-fresh-date]").forEach(function (e) { e.textContent = d || "—"; });
      var a = split(data.armies), b = split(data.bases);
      if (proArmyEl) { renderList(proArmyEl, a.pro, "army"); hideBlockIfEmpty(proArmyEl, a.pro.length); }
      renderList(armyEl, a.rest, "army");
      if (proBaseEl) { renderList(proBaseEl, b.pro, "base"); hideBlockIfEmpty(proBaseEl, b.pro.length); }
      renderList(baseEl, b.rest, "base");
    })
    .catch(function () {
      document.querySelectorAll("[data-fresh-fallback]").forEach(function (n) { n.style.display = "block"; });
    });
})();
