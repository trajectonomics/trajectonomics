import { test } from "node:test";
import assert from "node:assert/strict";
import { ANALYTICS_EVENTS, isAllowedEvent, sanitizeProps, statsChoiceIsOn } from "../../src/lib/analyticsEvents.ts";

test("usage stats are opt-in: only an explicit 'on' turns them on", () => {
  assert.equal(statsChoiceIsOn("on"), true);
  for (const choice of [null, undefined, "", "off", "true", "1", "ON"]) {
    assert.equal(statsChoiceIsOn(choice), false, String(choice));
  }
});

test("only listed events are allowed", () => {
  assert.equal(isAllowedEvent("record_saved"), true);
  assert.equal(isAllowedEvent("$screen"), true);
  for (const name of ["$pageview", "$autocapture", "$exception", "$opt_in", "toString", "constructor"]) {
    assert.equal(isAllowedEvent(name), false, name);
  }
  assert.equal(sanitizeProps("$autocapture", { tag_name: "button" }), null);
});

test("unknown properties are dropped", () => {
  assert.deepEqual(
    sanitizeProps("record_saved", {
      kind: "spending",
      is_new: true,
      recurring: false,
      amountSatang: 12500,
      payee: "7-Eleven",
    }),
    { kind: "spending", is_new: true, recurring: false },
  );
});

test("free text, long strings and non-finite numbers never pass", () => {
  assert.deepEqual(
    sanitizeProps("setting_changed", { setting: "language", value: "นายสมชาย ใจดี" }),
    { setting: "language" },
  );
  assert.deepEqual(sanitizeProps("setting_changed", { setting: "x".repeat(41), value: "has space" }), {});
  assert.deepEqual(sanitizeProps("statement_imported", { imported: Number.NaN, duplicates: 2 }), { duplicates: 2 });
  assert.deepEqual(sanitizeProps("data_exported", { format: { toString: () => "csv" } }), {});
});

test("labels used by the app pass", () => {
  assert.deepEqual(sanitizeProps("$screen", { $screen_name: "settings/about" }), { $screen_name: "settings/about" });
  assert.deepEqual(
    sanitizeProps("slip_scan_finished", { trigger: "album", imported: 3, duplicates: 0 }),
    { trigger: "album", imported: 3, duplicates: 0 },
  );
  assert.deepEqual(sanitizeProps("app_opened"), {});
});

test("no event may carry an amount, payee, note or name property", () => {
  const forbidden = /amount|satang|baht|payee|note|name(?!$)|account|category|tag|ocr|text|file|password|key/i;
  for (const [event, props] of Object.entries(ANALYTICS_EVENTS)) {
    for (const prop of props) {
      if (prop === "$screen_name") continue;
      assert.doesNotMatch(prop, forbidden, `${event}.${prop}`);
    }
  }
});
