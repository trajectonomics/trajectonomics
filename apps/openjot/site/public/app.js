// Language switch, live release info, and the animated Moo. The page works without it.
(function () {
  var root = document.documentElement;

  // Language ----------------------------------------------------------------
  function setLang(lang, save) {
    root.lang = lang;
    root.setAttribute("data-lang", lang);
    var buttons = document.querySelectorAll("[data-set-lang]");
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].setAttribute("aria-pressed", String(buttons[i].getAttribute("data-set-lang") === lang));
    }
    if (save) {
      try { localStorage.setItem("moojot_site_lang", lang); } catch (e) {}
    }
    // Each page names its own title per language on <html data-title-th / data-title-en>.
    var title = root.getAttribute("data-title-" + lang);
    if (title) document.title = title;
    if (lastRelease !== undefined) renderRelease(lastRelease);
  }
  document.addEventListener("click", function (event) {
    var button = event.target.closest && event.target.closest("[data-set-lang]");
    if (button) setLang(button.getAttribute("data-set-lang"), true);
  });
  setLang(root.getAttribute("data-lang") === "en" ? "en" : "th", false);

  // Release -----------------------------------------------------------------
  var lastRelease;

  function formatSize(bytes) {
    return (bytes / (1024 * 1024)).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0) + " MB";
  }

  function renderRelease(release) {
    lastRelease = release;
    if (release === null) {
      root.setAttribute("data-release", "soon");
      var links = document.querySelectorAll(".js-download");
      for (var i = 0; i < links.length; i++) links[i].setAttribute("href", "#coming-soon");
      return;
    }
    if (!release) return; // unknown: keep the plain /openjot/download link
    root.setAttribute("data-release", "ready");
    var android = root.lang === "th" ? "Android 7.0 ขึ้นไป (64 บิต)" : "Android 7.0+, 64-bit";
    var meta = document.querySelector(".js-release-meta");
    if (meta) {
      // "What's new in v1.1.0" links to that version's release notes on GitHub.
      var notes = document.createElement("a");
      notes.href = release.pageUrl;
      notes.textContent = (root.lang === "th" ? "มีอะไรใหม่ใน " : "What's new in ") + release.version;
      var rest = [release.apk.size ? formatSize(release.apk.size) : "", android].filter(Boolean);
      meta.textContent = "";
      meta.appendChild(release.pageUrl ? notes : document.createTextNode(release.version));
      meta.appendChild(document.createTextNode(" · " + rest.join(" · ")));
    }
    if (release.checksumsUrl) {
      // The worker's /openjot/download/checksums route resolves the same release, so the
      // link stays on this domain and keeps working when a release has no SHA256SUMS.
      var sums = document.querySelectorAll(".js-checksums");
      for (var j = 0; j < sums.length; j++) sums[j].setAttribute("href", "/openjot/download/checksums");
    }
  }

  if (window.fetch) {
    fetch("/openjot/api/release", { headers: { accept: "application/json" } })
      .then(function (res) { return res.ok ? res.json() : { release: undefined }; })
      .then(function (data) { renderRelease(data.release); })
      .catch(function () {});
  }

  // Moo waves once the page has loaded (the animated file is ~500 KB) -----------
  function wakeMoo() {
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var moo = document.querySelector(".js-moo");
    if (reduce || !moo) return;
    var animated = new Image();
    animated.onload = function () { moo.src = animated.src; };
    animated.src = moo.getAttribute("data-animated");
  }
  if (document.readyState === "complete") wakeMoo();
  else window.addEventListener("load", wakeMoo);
})();
