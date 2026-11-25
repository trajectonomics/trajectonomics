import { test } from "node:test";
import assert from "node:assert/strict";
import { LOCK_AFTER_MS, classifyUnlockError, lockOnReturn } from "../../src/lib/appLock.ts";

const T0 = Date.parse("2026-11-23T20:00:00+07:00");

test("the lock is opt-in: switched off, coming back never asks", () => {
  assert.equal(lockOnReturn(false, T0, T0 + 10 * LOCK_AFTER_MS), false);
});

test("back within a minute: no prompt", () => {
  assert.equal(LOCK_AFTER_MS, 60_000);
  assert.equal(lockOnReturn(true, T0, T0), false);
  assert.equal(lockOnReturn(true, T0, T0 + 30_000), false);
  assert.equal(lockOnReturn(true, T0, T0 + LOCK_AFTER_MS), false);
});

test("more than a minute away: ask again", () => {
  assert.equal(lockOnReturn(true, T0, T0 + LOCK_AFTER_MS + 1), true);
  assert.equal(lockOnReturn(true, T0, T0 + 8 * 60 * 60 * 1000), true);
});

test("a clock that went backwards locks rather than unlocks", () => {
  assert.equal(lockOnReturn(true, T0, T0 - 1), true);
});

test("never hidden: nothing to ask about", () => {
  assert.equal(lockOnReturn(true, null, T0), false);
});

test("only a missing screen lock lets the app open without a check", () => {
  assert.equal(classifyUnlockError("passcodeNotSet"), "no-screen-lock");
  // A busy or missing sensor is not "no screen lock": the PIN still works, so stay locked.
  for (const code of ["biometryNotAvailable", "biometryNotEnrolled", "invalidContext", "", undefined, null, 42]) {
    assert.equal(classifyUnlockError(code), "error", String(code));
  }
});

test("cancel and lockout keep the lock card up", () => {
  for (const code of ["userCancel", "systemCancel", "appCancel", "userFallback", "authenticationFailed"]) {
    assert.equal(classifyUnlockError(code), "cancelled", code);
  }
  assert.equal(classifyUnlockError("biometryLockout"), "lockout");
});
