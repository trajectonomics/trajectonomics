import { test } from "node:test";
import assert from "node:assert/strict";
import { homeGestureStart } from "../../src/lib/homeGesture.ts";

// Node has no DOM, so a fake element answers `closest` the way a browser would:
// `kinds` lists the element itself and its ancestors, and a selector part
// matches either a tag (`button`) or an attribute (`[data-swipe-row]`).
function fakeEl(...kinds) {
  return {
    closest(selector) {
      const parts = selector.split(",").map((part) => part.trim());
      const hit = kinds.find((kind) => parts.some((part) => matchesPart(kind, part)));
      return hit === undefined ? null : { kind: hit };
    },
  };
}

function matchesPart(kind, part) {
  const attribute = /^\[(.*)\]$/.exec(part);
  return kind === (attribute ? attribute[1] : part);
}

test("a plain area allows both the pull and the month swipe", () => {
  assert.deepEqual(homeGestureStart(fakeEl("div", "main")), {
    pull: true,
    monthSwipe: true,
  });
});

test("a touch on a record row still pulls, so the month with records can scan", () => {
  assert.deepEqual(homeGestureStart(fakeEl("button", "data-swipe-row", "div", "main")), {
    pull: true,
    monthSwipe: false,
  });
});

test("a button or a link still pulls, but keeps its own tap and month swipe", () => {
  for (const kind of ["button", "a"]) {
    assert.deepEqual(homeGestureStart(fakeEl(kind, "div", "main")), {
      pull: true,
      monthSwipe: false,
    });
  }
});

test("the row's delete button only pulls too", () => {
  assert.deepEqual(homeGestureStart(fakeEl("button", "data-swipe-row", "div")), {
    pull: true,
    monthSwipe: false,
  });
});

test("text entry starts neither, so typing keeps its own drag", () => {
  for (const kind of ["input", "textarea", "select", "contenteditable"]) {
    assert.deepEqual(homeGestureStart(fakeEl(kind, "div", "main")), {
      pull: false,
      monthSwipe: false,
    });
  }
});

test("a text field inside a record row is still text entry", () => {
  assert.deepEqual(homeGestureStart(fakeEl("input", "data-swipe-row", "div")), {
    pull: false,
    monthSwipe: false,
  });
});

test("no target starts nothing", () => {
  assert.deepEqual(homeGestureStart(null), { pull: false, monthSwipe: false });
});
