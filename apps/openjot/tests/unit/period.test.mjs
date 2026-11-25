import { test } from "node:test";
import assert from "node:assert/strict";
import {
  monthPeriod,
  periodForKey,
  periodKeysSince,
  periodRangeLabel,
} from "../../src/lib/period.ts";

// Local-time helpers, so the tests pass in any time zone.
const day = (y, m, d) => new Date(y, m - 1, d);
const ymd = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const range = (p) => [ymd(p.start), ymd(p.end), p.key];

const today = day(2026, 11, 22);

test("start day 25 on 2026-11-22: this month is 25 Oct - 24 Nov (#24)", () => {
  const p = monthPeriod(0, 25, today);
  assert.deepEqual(range(p), ["2026-10-25", "2026-11-24", "2026-10"]);
  assert.equal(periodRangeLabel(p), "25 Oct - 24 Nov");
  assert.equal(p.start.getHours(), 0, "the scan starts at local midnight");
});

test("start day 25: 3-month and 1-year scans step back by periods", () => {
  assert.deepEqual(range(monthPeriod(-3, 25, today)), ["2026-07-25", "2026-08-24", "2026-07"]);
  assert.deepEqual(range(monthPeriod(-12, 25, today)), ["2025-10-25", "2025-11-24", "2025-10"]);
});

test("start day 25 on the start day itself begins a new period", () => {
  assert.deepEqual(range(monthPeriod(0, 25, day(2026, 11, 25))), ["2026-11-25", "2026-12-24", "2026-11"]);
  assert.deepEqual(range(monthPeriod(0, 25, day(2026, 11, 24))), ["2026-10-25", "2026-11-24", "2026-10"]);
});

test("start day 1 keeps calendar months", () => {
  assert.deepEqual(range(monthPeriod(0, 1, today)), ["2026-11-01", "2026-11-30", "2026-11"]);
  assert.deepEqual(range(monthPeriod(-1, 1, today)), ["2026-10-01", "2026-10-31", "2026-10"]);
  assert.deepEqual(range(monthPeriod(-9, 1, today)), ["2026-02-01", "2026-02-28", "2026-02"]);
});

test("start day 31 is clamped to 28 like compute_month_period", () => {
  assert.deepEqual(range(monthPeriod(0, 31, day(2026, 2, 27))), ["2026-01-28", "2026-02-27", "2026-01"]);
  assert.deepEqual(range(monthPeriod(0, 31, day(2026, 2, 28))), ["2026-02-28", "2026-03-27", "2026-02"]);
  assert.deepEqual(monthPeriod(-5, 31, today), monthPeriod(-5, 28, today));
  assert.deepEqual(monthPeriod(0, 0, today), monthPeriod(0, 1, today));
});

test("periods roll over the year (Dec -> Jan)", () => {
  assert.deepEqual(range(monthPeriod(1, 1, day(2026, 12, 10))), ["2027-01-01", "2027-01-31", "2027-01"]);
  const jan = day(2027, 1, 10);
  const dec = monthPeriod(0, 25, jan);
  assert.deepEqual(range(dec), ["2026-12-25", "2027-01-24", "2026-12"]);
  assert.equal(periodRangeLabel(dec), "25 Dec - 24 Jan");
  assert.deepEqual(range(monthPeriod(1, 25, jan)), ["2027-01-25", "2027-02-24", "2027-01"]);
  assert.deepEqual(range(monthPeriod(-1, 25, jan)), ["2026-11-25", "2026-12-24", "2026-11"]);
});

test("scanned keys match the period on screen", () => {
  const thisPeriod = monthPeriod(0, 25, today);
  assert.deepEqual(periodKeysSince(thisPeriod.start, 25, today), [thisPeriod.key]);
  assert.deepEqual(periodKeysSince(monthPeriod(-3, 25, today).start, 25, today), [
    "2026-07",
    "2026-08",
    "2026-09",
    "2026-10",
  ]);
  assert.deepEqual(periodKeysSince(monthPeriod(0, 1, today).start, 1, today), ["2026-11"]);
  assert.deepEqual(periodKeysSince(monthPeriod(1, 25, today).start, 25, today), []);
});

test("a stored key maps back to the period that starts in that month", () => {
  assert.deepEqual(range(periodForKey("2026-10", 25)), ["2026-10-25", "2026-11-24", "2026-10"]);
  assert.deepEqual(range(periodForKey("2026-11", 1)), ["2026-11-01", "2026-11-30", "2026-11"]);
  assert.equal(periodForKey("not-a-key", 25), null);
});
