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

/* ---- "Fresh this week" feed (populated by the weekly GitHub Actions bot) ---- */
(function () {
  "use strict";
  var armyEl = document.getElementById("fresh-armies");
  var baseEl = document.getElementById("fresh-bases");
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
  function newTag(it) { return isNew(it.first_seen) ? '<span class="tag-new">NEW</span>' : ""; }

  function baseLabel(it) {
    var t = (it.type || "").toUpperCase();
    var kind = t === "HV" ? "Home / Trophy" : (t === "WB" ? "War / CWL" : "Layout");
    return (it.th ? "TH" + it.th + " " : "") + kind;
  }

  var LIMIT = 12;

  function renderList(el, items, ico, labelFn) {
    if (!items || !items.length) {
      el.innerHTML = '<p class="fresh-empty">No links yet — check back after the next Tuesday refresh.</p>';
      return;
    }
    var shown = items.slice(0, LIMIT);
    el.innerHTML = shown.map(function (it) {
      return '<a class="fresh-item" href="' + esc(it.url) + '" rel="nofollow">' +
        '<span class="ic">' + ico + '</span>' +
        '<span class="txt">' + esc(labelFn(it)) +
        '<span class="src">' + esc(it.source || "") + '</span></span>' +
        newTag(it) + "</a>";
    }).join("");
    if (items.length > LIMIT) {
      var more = document.createElement("p");
      more.className = "fresh-more";
      more.textContent = "+ " + (items.length - LIMIT) + " more in the weekly feed.";
      el.after(more);
    }
  }

  fetch("data/latest.json", { cache: "no-store" })
    .then(function (r) { if (!r.ok) throw new Error("no data"); return r.json(); })
    .then(function (data) {
      var d = (data.updated || "").slice(0, 10);
      document.querySelectorAll("[data-fresh-date]").forEach(function (e) { e.textContent = d || "—"; });
      if (armyEl) renderList(armyEl, data.armies, "⚔️", function () { return "Copy army"; });
      if (baseEl) renderList(baseEl, data.bases, "🛡️", baseLabel);
    })
    .catch(function () {
      document.querySelectorAll("[data-fresh-fallback]").forEach(function (n) { n.style.display = "block"; });
    });
})();
