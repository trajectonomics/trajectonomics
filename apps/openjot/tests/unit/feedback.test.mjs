import { test } from "node:test";
import assert from "node:assert/strict";
import {
  FEEDBACK_EMAIL,
  androidVersionFromUserAgent,
  feedbackMailto,
  shouldShowFeedbackCard,
} from "../../src/lib/feedback.ts";

const decode = (url) => {
  const [head, query] = url.split("?");
  const params = Object.fromEntries(query.split("&").map((p) => p.split("=")));
  return {
    head,
    subject: decodeURIComponent(params.subject),
    body: decodeURIComponent(params.body),
    raw: query,
  };
};

test("the mailto goes to support@ with the version in the subject", () => {
  assert.equal(FEEDBACK_EMAIL, "support@trajectonomics.com");
  const mail = decode(feedbackMailto({ version: "1.3.0", androidVersion: "14", lang: "en" }));
  assert.equal(mail.head, "mailto:support@trajectonomics.com");
  assert.equal(mail.subject, "[MooJot feedback] 1.3.0");
});

test("the body is two empty lines, a separator, the note and the three footer lines", () => {
  const mail = decode(feedbackMailto({ version: "1.3.0", androidVersion: "14", lang: "en" }));
  assert.equal(
    mail.body,
    [
      "",
      "",
      "---",
      "Please don't include account numbers or slip photos.",
      "App: MooJot 1.3.0",
      "Android: 14",
      "Language: en",
    ].join("\n"),
  );
});

test("the note is in the app language and the footer says th", () => {
  const mail = decode(feedbackMailto({ version: "1.3.0", androidVersion: null, lang: "th" }));
  const lines = mail.body.split("\n");
  assert.equal(lines[3], "กรุณาอย่าใส่เลขบัญชีหรือรูปสลิป");
  assert.deepEqual(lines.slice(4), ["App: MooJot 1.3.0", "Android: unknown", "Language: th"]);
});

test("spaces are %20, never +", () => {
  const url = feedbackMailto({ version: "1.3.0", androidVersion: "14", lang: "en" });
  assert.ok(url.includes("%20"));
  assert.ok(!url.includes("+"));
  assert.ok(!url.includes(" "));
});

test("nothing but the version, Android version and language is added", () => {
  const mail = decode(feedbackMailto({ version: "9.9.9", androidVersion: "13", lang: "en" }));
  const lines = mail.body.split("\n");
  assert.equal(lines.length, 7);
  assert.deepEqual(Object.keys(Object.fromEntries(mail.raw.split("&").map((p) => p.split("=")))), [
    "subject",
    "body",
  ]);
});

test("Android version comes from the user agent", () => {
  assert.equal(
    androidVersionFromUserAgent(
      "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/126.0 Mobile Safari/537.36",
    ),
    "14",
  );
  assert.equal(androidVersionFromUserAgent("Mozilla/5.0 (Linux; Android 8.1.0; Nexus 5)"), "8.1.0");
  assert.equal(androidVersionFromUserAgent("Mozilla/5.0 (X11; Linux x86_64) Chrome/126.0"), null);
  assert.equal(androidVersionFromUserAgent(""), null);
  assert.equal(androidVersionFromUserAgent(undefined), null);
});

const fresh = { firstSeenDate: "2026-11-20", successfulScans: 0, dismissed: false, used: false };

test("the card is hidden on day 1 with one scan", () => {
  assert.equal(shouldShowFeedbackCard({ ...fresh, successfulScans: 1 }, "2026-11-20"), false);
});

test("the card is hidden on day 2 with no scans", () => {
  assert.equal(shouldShowFeedbackCard(fresh, "2026-11-21"), false);
});

test("the card shows on the 2nd successful scan", () => {
  assert.equal(shouldShowFeedbackCard({ ...fresh, successfulScans: 2 }, "2026-11-20"), true);
});

test("the card shows on the 3rd day of use, and after", () => {
  assert.equal(shouldShowFeedbackCard(fresh, "2026-11-22"), true);
  assert.equal(shouldShowFeedbackCard(fresh, "2026-12-30"), true);
});

test("the 3rd day counts calendar days across a month end", () => {
  const state = { ...fresh, firstSeenDate: "2026-11-29" };
  assert.equal(shouldShowFeedbackCard(state, "2026-11-30"), false);
  assert.equal(shouldShowFeedbackCard(state, "2026-12-01"), true);
});

test("the card never shows after it was dismissed or used", () => {
  const ready = { ...fresh, successfulScans: 5 };
  assert.equal(shouldShowFeedbackCard({ ...ready, dismissed: true }, "2027-01-01"), false);
  assert.equal(shouldShowFeedbackCard({ ...ready, used: true }, "2027-01-01"), false);
});
