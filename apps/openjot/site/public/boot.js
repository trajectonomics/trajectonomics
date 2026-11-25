// Runs before first paint so the page never flashes the wrong language.
// Order: ?lang= in the URL, then the visitor's saved choice, then the browser.
(function () {
  var root = document.documentElement;
  var lang = null;
  try {
    var q = new URLSearchParams(location.search).get("lang");
    if (q === "th" || q === "en") lang = q;
    if (!lang) {
      var saved = localStorage.getItem("moojot_site_lang");
      if (saved === "th" || saved === "en") lang = saved;
    }
  } catch (e) {}
  if (!lang) {
    var prefs = navigator.languages || [navigator.language || ""];
    lang = "en";
    for (var i = 0; i < prefs.length; i++) {
      var p = String(prefs[i]).toLowerCase();
      if (p.indexOf("th") === 0) { lang = "th"; break; }
      if (p.indexOf("en") === 0) break;
    }
  }
  root.lang = lang;
  root.setAttribute("data-lang", lang);

  // Instagram, Facebook, LINE and TikTok open links in a webview where APK
  // downloads often fail. Flag it so the page can say how to leave.
  if (/Instagram|FBAN|FBAV|FB_IAB|Line\/|musical_ly|BytedanceWebview/i.test(navigator.userAgent)) {
    root.setAttribute("data-inapp", "");
  }
  if (!/Android/i.test(navigator.userAgent) && /iPhone|iPad|iPod/i.test(navigator.userAgent)) {
    root.setAttribute("data-ios", "");
  }
})();
