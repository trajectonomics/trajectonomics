// Cookie consent and PostHog web analytics for the landing page.
//
// Nothing is loaded and no cookie is set until the visitor taps "Allow". The choice is
// kept in localStorage ("moojot_site_consent" = "granted" | "denied"), which the page
// needs in order to remember it. "Cookie settings" in the footer reopens the banner.
//
// PostHog is loaded from this domain through the Worker's /openjot/ingest proxy
// (site/tracking.js), so the Content-Security-Policy stays 'self'. Source links
// (/openjot/go/...) and downloads are counted by the Worker without cookies either way.
(function () {
  // PostHog project API key. Public by design: it can only send events.
  var POSTHOG_KEY = "phc_uNb2thEMk4Rh7HrKRaThNsxSwFGxta4gnV5dxBcH5T9n";
  var CHOICE_KEY = "moojot_site_consent";
  var banner = document.querySelector(".js-consent");

  function readChoice() {
    try { return localStorage.getItem(CHOICE_KEY); } catch (e) { return null; }
  }
  function saveChoice(value) {
    try { localStorage.setItem(CHOICE_KEY, value); } catch (e) {}
  }

  function loadPostHog() {
    if (window.posthog) return;
    var host = location.origin + "/openjot/ingest";
    // A minimal version of PostHog's snippet: queue calls until array.js takes over.
    var stub = [];
    stub._i = [[POSTHOG_KEY, {
      api_host: host,
      ui_host: "https://eu.posthog.com",
      person_profiles: "identified_only",
      persistence: "localStorage+cookie",
      secure_cookie: true,
      cross_subdomain_cookie: false, // keep the cookie on this domain only
      capture_pageview: true,
      capture_pageleave: true,
      autocapture: true,
      disable_session_recording: true,
      disable_surveys: true
    }, undefined]];
    ["capture", "register"].forEach(function (name) {
      stub[name] = function () { stub.push([name].concat(Array.prototype.slice.call(arguments))); };
    });
    window.posthog = stub;
    var script = document.createElement("script");
    script.src = host + "/static/array.js";
    script.async = true;
    script.crossOrigin = "anonymous";
    document.head.appendChild(script);
  }

  // Remove everything PostHog stored. The caller reloads, so no PostHog script keeps running.
  function forgetPostHog() {
    var ph = window.posthog;
    // Still loading: empty the init queue so array.js has nothing to start if it lands now.
    if (ph && !ph.__loaded && ph._i) ph._i.length = 0;
    if (ph && ph.__loaded) {
      try {
        ph.opt_out_capturing();
        // Otherwise PostHog writes its cookie again as the page unloads.
        ph.set_config({ disable_persistence: true });
      } catch (e) {}
    }
    var host = location.hostname;
    var parent = "." + host.split(".").slice(-2).join(".");
    document.cookie.split(";").forEach(function (part) {
      var name = part.split("=")[0].trim();
      if (name.indexOf("ph_") !== 0 && name.indexOf("__ph") !== 0) return;
      ["", "; Domain=" + host, "; Domain=" + parent].forEach(function (domain) {
        ["", "; Secure"].forEach(function (secure) {
          document.cookie = name + "=; Max-Age=0; Path=/; SameSite=Lax" + domain + secure;
        });
      });
    });
    try {
      for (var i = localStorage.length - 1; i >= 0; i--) {
        var key = localStorage.key(i);
        if (key && (key.indexOf("ph_") === 0 || key.indexOf("__ph") === 0)) localStorage.removeItem(key);
      }
      sessionStorage.clear();
    } catch (e) {}
  }

  function showBanner(show) {
    if (!banner) return;
    banner.hidden = !show;
    if (show) {
      var first = banner.querySelector("[data-consent]");
      if (first) first.focus({ preventScroll: true });
    }
  }

  function choose(value) {
    var before = readChoice();
    saveChoice(value);
    showBanner(false);
    if (value === "granted") {
      loadPostHog();
    } else if (before === "granted") {
      forgetPostHog();
      location.reload();
    }
  }

  document.addEventListener("click", function (event) {
    var target = event.target.closest && event.target.closest("[data-consent], .js-consent-open");
    if (!target) return;
    if (target.classList.contains("js-consent-open")) showBanner(true);
    else choose(target.getAttribute("data-consent"));
  });
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && banner && !banner.hidden && readChoice()) showBanner(false);
  });

  var opener = document.querySelectorAll(".js-consent-open");
  for (var i = 0; i < opener.length; i++) opener[i].hidden = false;

  var choice = readChoice();
  if (choice === "granted") loadPostHog();
  else if (choice !== "denied" && banner) banner.hidden = false; // ask, without stealing focus
})();
