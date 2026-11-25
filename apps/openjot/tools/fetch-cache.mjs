// Downloads with a retry, a small concurrency limit and an on-disk JSON cache, so a
// regeneration after a fresh clone is slow once and quick afterwards.

import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";

// A generic client name: the registries ask automated clients to identify themselves.
const USER_AGENT = "third-party-notices-generator";

export async function download(url, { tries = 4 } = {}) {
  let lastError;
  for (let attempt = 1; attempt <= tries; attempt++) {
    try {
      const res = await fetch(url, { headers: { "user-agent": USER_AGENT }, redirect: "follow" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return Buffer.from(await res.arrayBuffer());
    } catch (error) {
      lastError = error;
      await new Promise((r) => setTimeout(r, 500 * attempt));
    }
  }
  throw new Error(`${url}: ${lastError?.message ?? lastError}`);
}

/** Runs `fn` over `items` with at most `limit` in flight; results keep the input order. */
export async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

/** Returns the cached JSON for `key`, or computes it with `compute()` and stores it. */
export async function cached(cacheDir, key, compute) {
  const file = join(cacheDir, `${key}.json`);
  if (existsSync(file)) return JSON.parse(readFileSync(file, "utf8"));
  const value = await compute();
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(value));
  return value;
}
