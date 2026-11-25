// The parts of "Send feedback" (#90) that touch the phone: the app version, the clipboard and
// the email app. The pure pieces are in feedback.ts.

import { getVersion } from "@tauri-apps/api/app";
import { openUrl } from "@tauri-apps/plugin-opener";
import {
  FEEDBACK_EMAIL,
  androidVersionFromUserAgent,
  feedbackMailto,
  type FeedbackLang,
} from "./feedback";

/** Copy the support address. True when it landed on the clipboard. */
export async function copyFeedbackEmail(): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(FEEDBACK_EMAIL);
    return true;
  } catch {
    // Fall through to the older way, for WebViews without the async clipboard.
  }
  try {
    const box = document.createElement("textarea");
    box.value = FEEDBACK_EMAIL;
    box.setAttribute("readonly", "");
    box.style.position = "fixed";
    box.style.opacity = "0";
    document.body.appendChild(box);
    box.select();
    const ok = document.execCommand("copy");
    box.remove();
    return ok;
  } catch {
    return false;
  }
}

/**
 * Open the email app with the feedback mail. Returns "opened", or "copied" when no email app
 * took it and the address was copied instead.
 */
export async function openFeedbackMail(lang: FeedbackLang): Promise<"opened" | "copied"> {
  let version = "unknown";
  try {
    version = await getVersion();
  } catch {
    // A plain browser or dev build has no app version.
  }
  const url = feedbackMailto({
    version,
    androidVersion: androidVersionFromUserAgent(navigator.userAgent),
    lang,
  });
  // In a plain browser (dev build) there is no opener plugin: let the browser handle mailto.
  if (typeof window !== "undefined" && !("__TAURI_INTERNALS__" in window)) {
    window.location.href = url;
    return "opened";
  }
  try {
    await openUrl(url);
    return "opened";
  } catch {
    await copyFeedbackEmail();
    return "copied";
  }
}
