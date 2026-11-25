// Guards an assumption in src/lib/analytics.ts: when the user turns usage stats off, the app
// sets `__loaded = false` on the PostHog instance, because opt_out_capturing() alone leaves
// queued retries and unload beacons running. That only works while PostHog's dispatcher
// drops every request for an instance that isn't loaded. If a posthog-js upgrade changes
// that, this test fails, and the opt-out in analytics.ts needs another way to stop sending.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { sendRequest } = require("posthog-js/lib/src/request-dispatch.js");

test("PostHog's dispatcher drops requests while the instance isn't loaded", () => {
  let response = null;
  const originalFetch = globalThis.fetch;
  let fetched = false;
  globalThis.fetch = async () => {
    fetched = true;
    return new Response("{}");
  };
  try {
    sendRequest(
      { __loaded: false },
      { url: "https://example.invalid/e/", data: { event: "x" }, fireCallbackOnDrop: true, callback: (r) => (response = r) },
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
  assert.deepEqual(response, { statusCode: 0 });
  assert.equal(fetched, false);
});
