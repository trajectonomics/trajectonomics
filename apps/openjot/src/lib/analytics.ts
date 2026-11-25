// Anonymous, opt-in product analytics for the Android app. Events go to PostHog
// (EU Cloud) through the website's first-party proxy, moojot.trajectonomics.com/ingest
// (see site/tracking.js). What may be sent is listed in analyticsEvents.ts, and
// docs/privacy-policy.md tells users about it.
//
// - Off until the user turns it on: on the "private" step of the welcome tour, or in My Moo.
//   Until then PostHog is never loaded and nothing is sent or queued.
// - Only the Android release build sends anything. `pnpm dev` and the browser preview never do.
// - No autocapture, session replay, surveys, heatmaps, exception capture or remote config.
//   The no-external bundle can't download more code at runtime.

import type { PostHog } from "posthog-js";
import { getVersion } from "@tauri-apps/api/app";
import { hasAndroidBridge } from "./api";
import {
  isAllowedEvent,
  sanitizeProps,
  statsChoiceIsOn,
  type AnalyticsEvent,
  type AnalyticsProps,
} from "./analyticsEvents";

/** PostHog project API key. It is public by design: it can only write events. */
export const POSTHOG_KEY = "phc_uNb2thEMk4Rh7HrKRaThNsxSwFGxta4gnV5dxBcH5T9n";
const API_HOST = "https://moojot.trajectonomics.com/ingest";
const UI_HOST = "https://eu.posthog.com";

const PREF_KEY = "moojot_analytics"; // "on" | "off"; missing means the user hasn't opted in
const MAX_PENDING = 50;

let client: PostHog | null = null;
let starting: Promise<void> | null = null;
let pending: [AnalyticsEvent, AnalyticsProps | undefined][] = [];
let context: Record<string, string> = {};
let appVersion = "unknown";

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore storage restrictions
  }
}

/** True only in the Android release build, the one place analytics may run. */
export function analyticsSupported(): boolean {
  return import.meta.env.PROD && hasAndroidBridge();
}

/** The user's choice. Analytics is opt-in, so this is false until they turn it on. */
export function analyticsEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return statsChoiceIsOn(read(PREF_KEY));
}

/** Record the user's choice. `where` says which switch they used. */
export function setAnalyticsEnabled(on: boolean, where: "onboarding" | "settings") {
  write(PREF_KEY, on ? "on" : "off");
  if (on) {
    void startAnalytics();
    track("usage_stats_enabled", { where });
    return;
  }
  pending = [];
  if (client) {
    // reset() clears PostHog's consent state too, so it has to come before the opt-out.
    // It also drops the anonymous id: turning stats back on later starts a new one.
    client.reset();
    client.opt_out_capturing();
    // opt_out_capturing() stops new events, but PostHog's queues keep retrying unsent
    // requests and flush them with sendBeacon when the app closes. Its dispatcher drops
    // every request while __loaded is false, so off means nothing more leaves the phone.
    client.__loaded = false;
  }
}

/** Load and start PostHog if the build and the user allow it. Safe to call repeatedly. */
export function startAnalytics(): Promise<void> {
  if (!analyticsSupported() || !analyticsEnabled()) return Promise.resolve();
  if (client) {
    client.__loaded = true; // see setAnalyticsEnabled(false)
    if (client.has_opted_out_capturing()) client.opt_in_capturing({ captureEventName: false });
    client.register(baseProperties()); // reset() dropped them when stats were turned off
    return Promise.resolve();
  }
  starting ??= (async () => {
    try {
      const [{ default: posthog }, version] = await Promise.all([
        import("posthog-js/no-external"),
        getVersion().catch(() => "unknown"),
      ]);
      appVersion = version;
      if (!analyticsEnabled()) return; // turned off while loading
      posthog.init(POSTHOG_KEY, {
        api_host: API_HOST,
        ui_host: UI_HOST,
        persistence: "localStorage",
        person_profiles: "always",
        autocapture: false,
        capture_pageview: false,
        capture_pageleave: false,
        capture_dead_clicks: false,
        capture_heatmaps: false,
        capture_exceptions: false,
        capture_performance: false,
        rageclick: false,
        disable_session_recording: true,
        disable_surveys: true,
        disable_product_tours: true,
        disable_conversations: true,
        disable_web_experiments: true,
        disable_external_dependency_loading: true,
        // No /flags call: nothing in PostHog's project settings can switch features on here.
        advanced_disable_flags: true,
        save_referrer: false,
        mask_all_text: true,
        mask_all_element_attributes: true,
        // Last line of defence: only events listed in analyticsEvents.ts leave the phone.
        before_send: (event) => (event && isAllowedEvent(event.event) ? event : null),
      });
      // A choice of "off" in an earlier session leaves PostHog opted out. The user has
      // since turned stats back on (or this wouldn't run), so follow the new choice.
      if (posthog.has_opted_out_capturing()) posthog.opt_in_capturing({ captureEventName: false });
      posthog.register(baseProperties());
      client = posthog;
      const queued = pending;
      pending = [];
      for (const [event, props] of queued) track(event, props);
    } catch (error) {
      console.warn("analytics: could not start", error);
      pending = [];
    } finally {
      starting = null;
    }
  })();
  return starting;
}

function baseProperties(): Record<string, string> {
  return { platform: "android", app_version: appVersion, ...context };
}

/** Send one allowlisted event. Does nothing when analytics is off or unsupported. */
export function track(event: AnalyticsEvent, props?: AnalyticsProps) {
  if (!analyticsSupported() || !analyticsEnabled()) return;
  if (!client) {
    // Only queue while PostHog is loading after an opt-in, never before it.
    if (starting && pending.length < MAX_PENDING) pending.push([event, props]);
    return;
  }
  const clean = sanitizeProps(event, props);
  if (clean) client.capture(event, clean);
}

export function trackScreen(name: string) {
  track("$screen", { $screen_name: name });
}

/** Labels sent with every event, such as the UI language and theme. */
export function setAnalyticsContext(next: Record<string, string>) {
  context = { ...context, ...next };
  client?.register(next);
}
