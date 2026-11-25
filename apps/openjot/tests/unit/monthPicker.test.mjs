import { test } from "node:test";
import assert from "node:assert/strict";
import { monthPickerOffsets } from "../../src/lib/monthPicker.ts";

test("this month sits between next month and last month (#10)", () => {
  const offsets = monthPickerOffsets();
  const current = offsets.indexOf(0);
  assert.notEqual(current, -1, "this month (offset 0) must be in the list");
  assert.equal(offsets[current - 1], 1, "next month comes right before this month");
  assert.equal(offsets[current + 1], -1, "last month comes right after this month");
});

test("months run newest first with no gaps", () => {
  const offsets = monthPickerOffsets();
  assert.deepEqual(offsets, [1, 0, -1, -2, -3, -4, -5, -6, -7, -8, -9, -10, -11, -12]);
  for (let i = 1; i < offsets.length; i++) {
    assert.equal(offsets[i], offsets[i - 1] - 1);
  }
});

test("range is configurable", () => {
  assert.deepEqual(monthPickerOffsets(0, 2), [0, -1, -2]);
  assert.deepEqual(monthPickerOffsets(2, 1), [2, 1, 0, -1]);
});
