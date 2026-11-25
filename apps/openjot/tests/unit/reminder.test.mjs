import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_REMINDER_TIME, localDateKey, parseReminderTime, reminderConfig, reminderText } from "../../src/lib/reminder.ts";

test("the reminder defaults to 20:00", () => {
  assert.equal(DEFAULT_REMINDER_TIME, "20:00");
  assert.deepEqual(parseReminderTime(DEFAULT_REMINDER_TIME), { hour: 20, minute: 0 });
});

test("a saved time is read as hour and minute", () => {
  assert.deepEqual(parseReminderTime("07:05"), { hour: 7, minute: 5 });
  assert.deepEqual(parseReminderTime("00:00"), { hour: 0, minute: 0 });
  assert.deepEqual(parseReminderTime("23:59"), { hour: 23, minute: 59 });
});

test("anything that isn't a real HH:MM time falls back to 20:00", () => {
  for (const bad of ["24:00", "12:60", "7:05", "", null, undefined, "noon", "07:05:00"]) {
    assert.deepEqual(parseReminderTime(bad), { hour: 20, minute: 0 }, String(bad));
  }
});

test("a jot counts for the local calendar day", () => {
  // 23:30 on 23 November in Bangkok is still the 23rd there, though it is the 23rd 16:30 UTC.
  assert.equal(localDateKey(new Date(2026, 10, 23, 23, 30)), "2026-11-23");
  assert.equal(localDateKey(new Date(2026, 0, 5, 0, 0)), "2026-01-05");
});

test("the notification follows the app's language", () => {
  assert.match(reminderText("en").title, /jot/i);
  assert.match(reminderText("th").title, /จด/);
  assert.notEqual(reminderText("en").body, reminderText("th").body);
});

test("the sync sends the switch, the time and the text", () => {
  assert.deepEqual(reminderConfig({ reminderEnabled: true, reminderTime: "21:15", language: "en" }), {
    enabled: true,
    hour: 21,
    minute: 15,
    ...reminderText("en"),
  });
  assert.equal(reminderConfig({ reminderEnabled: false, reminderTime: "bad", language: "th" }).hour, 20);
});
