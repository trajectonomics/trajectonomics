import { rm } from "node:fs/promises"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import type { AstroIntegration } from "astro"

/** The deletion of a `_redirects` file left in the Worker's assets root by an earlier build. */
export async function removeStaleRedirects(assetsRoot: string): Promise<void> {
	await rm(join(assetsRoot, "_redirects"), { force: true })
}

// A `_redirects` file in the assets root would send `/` away from the Landing Page. Astro
// empties `outDir`, and this still removes one a plugin writes during the build.
/** The Astro integration that runs {@link removeStaleRedirects} after every build. */
export function staleRedirects(): AstroIntegration {
	return {
		name: "stale-redirects",
		hooks: {
			"astro:build:done": async ({ dir }) => {
				await removeStaleRedirects(fileURLToPath(dir))
			},
		},
	}
}
