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

/* ---- Per-strategy "Watch on YouTube" buttons (attacks page) ---- */
(function () {
  "use strict";
  var strats = document.querySelectorAll(".strat[id]");
  if (!strats.length) return;
  strats.forEach(function (strat) {
    var h = strat.querySelector("h3");
    var row = strat.querySelector(".dl-row");
    if (!h || !row || row.querySelector(".watch-btn")) return;
    var name = h.textContent.replace(/\(.*?\)/g, "").trim();
    var q = encodeURIComponent("TH18 " + name + " attack 2026");
    var a = document.createElement("a");
    a.className = "btn btn-ghost btn-sm watch-btn";
    a.href = "https://www.youtube.com/results?search_query=" + q;
    a.target = "_blank";
    a.rel = "noopener";
    a.textContent = "▶ Watch";
    row.appendChild(a);
  });
})();

/* ---- Attack picker (attacks page) ---- */
(function () {
  "use strict";
  var root = document.getElementById("picker");
  if (!root) return;

  var STRATS = {
    thrower:  { id: "thrower-smash", name: "Mass Thrower Smash", tag: "Ground", cls: "ground",
      why: "Throwers lob over walls into the compartments while Healers keep the pack alive — the safe, high-floor meta pick." },
    rcmeteor: { id: "rc-meteor", name: "RC Walk Meteor Golem", tag: "Ground", cls: "ground",
      why: "An RC walk builds the funnel and Meteor Golems grind a centered, splash-heavy core." },
    bowlers:  { id: "queen-bowlers", name: "Queen Charge Super Bowlers", tag: "Ground", cls: "ground",
      why: "Pure ground — it ignores strong air defense and the Queen snipes exposed key defenses." },
    fireloon: { id: "fireball-loons", name: "Fireball Rocket Loons", tag: "Air", cls: "air",
      why: "Fireball + Giant Arrow delete the air defense, then fast Rocket Balloons rip through the core." },
    electro:  { id: "electro", name: "Electro Dragon Spam", tag: "Air", cls: "air",
      why: "Chain lightning shreds compact bases with weak air defense — and it's low-micro to fly." },
    hydra:    { id: "hydra", name: "Hydra", tag: "Air", cls: "air",
      why: "Ice Hounds tank for Dragons and Dragon Riders on bases without stacked, centered air defense." },
    zap:      { id: "zap-throwers", name: "Zap Throwers (Dragon Duke)", tag: "Hybrid", cls: "hybrid",
      why: "Zap open the one scary defense cluster, then Throwers grind through the hole you made." }
  };

  var state = {};
  root.querySelectorAll(".pq").forEach(function (row) {
    var q = row.getAttribute("data-q");
    row.querySelectorAll(".popt").forEach(function (btn) {
      btn.addEventListener("click", function () {
        row.querySelectorAll(".popt").forEach(function (b) { b.classList.remove("active"); });
        btn.classList.add("active");
        state[q] = btn.getAttribute("data-v");
      });
    });
  });

  function recommend(a) {
    var s = { thrower: 1, rcmeteor: 0, bowlers: 0, fireloon: 0, electro: 0, hydra: 0, zap: 0 };
    if (a.th === "center") { s.rcmeteor += 2; s.thrower += 1; s.fireloon += 1; }
    else if (a.th === "edge") { s.bowlers += 2; s.zap += 1; s.electro += 1; }
    if (a.air === "strong") { s.thrower += 1; s.rcmeteor += 1; s.bowlers += 3; }
    else if (a.air === "weak") { s.fireloon += 2; s.electro += 2; s.hydra += 2; }
    if (a.layout === "compart") { s.thrower += 2; s.rcmeteor += 2; s.electro += 1; s.zap += 1; }
    else if (a.layout === "open") { s.hydra += 2; s.fireloon += 1; s.bowlers += 1; }
    if (a.pref === "ground") { s.thrower += 2; s.rcmeteor += 2; s.bowlers += 2; s.fireloon -= 2; s.electro -= 2; s.hydra -= 2; }
    else if (a.pref === "air") { s.fireloon += 2; s.electro += 2; s.hydra += 2; s.thrower -= 2; s.rcmeteor -= 2; s.bowlers -= 2; }
    else if (a.pref === "either") { s.thrower += 1; s.hydra += 1; }
    return Object.keys(s).map(function (k) { return [k, s[k]]; })
      .sort(function (x, y) { return y[1] - x[1]; }).map(function (x) { return x[0]; });
  }

  function card(key, primary) {
    var st = STRATS[key];
    return '<div class="rec' + (primary ? "" : " alt") + '">' +
      '<span class="rec-tag">' + (primary ? "Recommended" : "Also consider") + "</span>" +
      '<h4><a href="#' + st.id + '">' + st.name + '</a> <span class="chip ' + st.cls + '">' + st.tag + "</span></h4>" +
      "<p>" + st.why + "</p></div>";
  }

  document.getElementById("picker-go").addEventListener("click", function () {
    var order = recommend(state);
    var out = document.getElementById("picker-result");
    var answered = Object.keys(state).length;
    var lead = answered < 4
      ? '<p class="faint" style="font-size:.85rem;margin:0 0 10px">Based on ' + answered +
        ' of 4 answers — fill in the rest to refine it.</p>' : "";
    out.innerHTML = lead + card(order[0], true) + card(order[1], false);
    out.hidden = false;
    out.scrollIntoView({ block: "nearest", behavior: "smooth" });
  });
})();

/* ---- Weekly meta digest (home page) ---- */
(function () {
  "use strict";
  var el = document.getElementById("meta-digest");
  if (!el) return;
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  fetch("data/latest.json", { cache: "no-store" })
    .then(function (r) { if (!r.ok) throw new Error("no data"); return r.json(); })
    .then(function (d) {
      var g = d.digest || {};
      var date = g.date || (d.updated || "").slice(0, 10);
      var changed = (g.new_armies || 0) + (g.new_bases || 0);
      var head = '<span class="dg-title">📈 This week in the meta ' +
        '<span class="faint" style="font-weight:500;font-size:.8rem">· ' + esc(date) + "</span></span>";
      var stat = changed > 0
        ? '<span class="dg-stat"><b>' + g.new_armies + "</b> new armies · <b>" + g.new_bases +
          "</b> new bases found this week</span>"
        : '<span class="dg-stat">No new armies or bases this week — the meta held steady.</span>';
      var totals = '<span class="dg-stat">Tracking <b>' + (g.total_armies || 0) + "</b> armies · <b>" +
        (g.total_bases || 0) + '</b> bases · <a href="attacks.html#fresh">auto-refreshed weekly</a></span>';
      var hl = "";
      if (g.highlights && g.highlights.length) {
        hl = '<div class="dg-new">' + g.highlights.map(function (h) {
          return '<span class="h">🆕 ' + esc(h.head) + ' <span class="faint">· ' + esc(h.source) +
            (h.pro ? " · PRO" : "") + "</span></span>";
        }).join("") + "</div>";
      }
      el.innerHTML = head + stat + totals + hl;
    })
    .catch(function () {
      var s = document.getElementById("digest-section");
      if (s) s.style.display = "none";
    });
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

  function shortList(s, n) {
    if (!s) return "";
    var arr = s.split(" · ");
    return arr.length <= n ? s : arr.slice(0, n).join(" · ") + " +" + (arr.length - n);
  }

  function itemHtml(it, kind) {
    if (kind === "army") {
      var head = it.head || "Copy army";
      var sub = it.spells ? '<span class="sub">🧪 ' + esc(it.spells) + "</span>" : "";
      var eq = it.equip ? '<span class="sub eq">🎽 ' + esc(shortList(it.equip, 6)) + "</span>" : "";
      var tip = it.comp ? ' title="' + esc(it.comp) + '"' : "";
      return '<a class="fresh-item army" href="' + esc(it.url) + '" rel="nofollow"' + tip + ">" +
        '<span class="ic">⚔️</span>' +
        '<span class="txt"><span class="head">' + esc(head) + "</span>" + sub + eq +
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
    var nx = el.nextElementSibling;
    if (nx && nx.classList.contains("fresh-more")) nx.remove();
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
  function showBlock(el, n) {
    var block = el && el.closest("[data-pro-block]");
    if (block) block.style.display = n ? "" : "none";
  }
  function setupBaseFilters(b) {
    var bar = document.getElementById("base-filters");
    function render(f) {
      var pro = f === "all" ? b.pro : b.pro.filter(function (x) { return (x.type || "") === f; });
      var rest = f === "all" ? b.rest : b.rest.filter(function (x) { return (x.type || "") === f; });
      if (proBaseEl) { renderList(proBaseEl, pro, "base"); showBlock(proBaseEl, pro.length); }
      renderList(baseEl, rest, "base");
    }
    render("all");
    if (bar) {
      bar.querySelectorAll(".popt").forEach(function (btn) {
        btn.addEventListener("click", function () {
          bar.querySelectorAll(".popt").forEach(function (o) { o.classList.remove("active"); });
          btn.classList.add("active");
          render(btn.getAttribute("data-filter"));
        });
      });
    }
  }

  fetch("data/latest.json", { cache: "no-store" })
    .then(function (r) { if (!r.ok) throw new Error("no data"); return r.json(); })
    .then(function (data) {
      var d = (data.updated || "").slice(0, 10);
      document.querySelectorAll("[data-fresh-date]").forEach(function (e) { e.textContent = d || "—"; });
      var a = split(data.armies), b = split(data.bases);
      if (proArmyEl) { renderList(proArmyEl, a.pro, "army"); hideBlockIfEmpty(proArmyEl, a.pro.length); }
      renderList(armyEl, a.rest, "army");
      setupBaseFilters(b);
    })
    .catch(function () {
      document.querySelectorAll("[data-fresh-fallback]").forEach(function (n) { n.style.display = "block"; });
    });
})();
