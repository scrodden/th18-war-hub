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
