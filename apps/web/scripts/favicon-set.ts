import { existsSync } from "node:fs"
import { copyFile, mkdir, readFile } from "node:fs/promises"
import { createRequire } from "node:module"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import type { Plugin } from "vite"

/** The package the Favicon Set ships in, the one the layout takes its mark from. */
const ASSETS_PACKAGE = "@trajectonomics/brand/current"

/** The files of the Favicon Set a browser, an iOS home screen and an Android home screen ask for. */
const FAVICONS = [
	"favicon.svg",
	"favicon.ico",
	"apple-touch-icon.png",
	"icon-192.png",
	"icon-512.png",
] as const

/** The folder of the Dashboard's static directory the set is served from, so every icon URL is stable. */
const DESTINATION = "favicon"

/**
 * The Dashboard's folder: the nearest folder above this module that holds a `package.json`. Vite bundles the config
 * and this module together beside `vite.config.ts`, and a native config load keeps this file in `scripts/`, so a walk
 * up from either finds the app and never depends on where the build was started.
 */
function appDirectory(): string {
	let directory = dirname(fileURLToPath(import.meta.url))
	while (!existsSync(join(directory, "package.json"))) {
		const parent = dirname(directory)
		if (parent === directory) throw new Error("the Dashboard's package.json was not found")
		directory = parent
	}
	return directory
}

/** Copies the Favicon Set from the brand package into the Dashboard's static directory at build time. */
export function faviconSet(): Plugin {
	return {
		name: "traj-favicon-set",
		enforce: "pre",
		// Runs before SvelteKit's own config hook reads `files.assets` ("public"), so the set is there to copy.
		async config() {
			const app = appDirectory()
			const require = createRequire(join(app, "package.json"))
			const source = dirname(require.resolve(`${ASSETS_PACKAGE}/favicon/favicon.svg`))
			const target = join(app, "public", DESTINATION)
			await mkdir(target, { recursive: true })
			for (const favicon of FAVICONS) {
				const from = join(source, favicon)
				const to = join(target, favicon)
				// A file that already holds the same bytes is left alone, so the two build targets running at once never
				// read an icon the other is rewriting. The folder is gitignored and rewritten each build, so turbo needs
				// no input or output for it: a brand change reaches the build's hash through `^build`.
				if (existsSync(to) && (await readFile(to)).equals(await readFile(from))) continue
				await copyFile(from, to)
			}
			console.log(`copied the Favicon Set into public/${DESTINATION}/`)
		},
	}
}
