import config from "./overrides.json"

/**
 * The path the Site serves the hosted build under. SvelteKit's `paths.base` (vite.config.ts) and every link the twins
 * write start from this one value (`overrides.json`), so the two cannot drift.
 */
export const HOSTED_BASE: string = config.base

/**
 * The closed list of modules the hosted build replaces, from the path under `src/` to the twin's file in this folder
 * ([ADR 0028](../../docs/adr/0028-the-hosted-demo-is-a-second-build-target-with-no-edit-client.md)).
 * `vite.config.ts` applies it, and only in the hosted build, so the loopback build's sources are the ones it has always
 * had. `overrides.test.ts` pins the list: a twin exports what its original exports, and every module that can reach
 * the loopback server's write path is on it. The list is JSON so the Vite config can read it with no local import.
 */
export const OVERRIDES: Readonly<Record<string, string>> = config.modules
