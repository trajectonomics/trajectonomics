import { copyFile, mkdir } from "node:fs/promises"
import { createRequire } from "node:module"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import type { AstroIntegration } from "astro"

/** The assets package that ships the Favicon Set. */
const ASSETS_PACKAGE = "@trajectonomics/design-system-assets"

/** The files of the Favicon Set a browser, an iOS home screen and an Android home screen ask for. */
const FAVICONS = [
	"favicon.svg",
	"favicon.ico",
	"apple-touch-icon.png",
	"icon-192.png",
	"icon-512.png",
] as const

/** The directory in the Site's static directory the set is served from, so every icon URL is stable. */
const DESTINATION = "favicon"

/** The resolver the Astro build runs under, which is Node and not Bun. */
const resolve = createRequire(import.meta.url).resolve

/** Where the published package keeps the Favicon Set, found through the package's own exports. */
function faviconSource(): string {
	return dirname(resolve(`${ASSETS_PACKAGE}/favicon/favicon.svg`))
}

/** Copies the Favicon Set from the pinned assets package into the Site's static directory at build time. */
export function faviconSet(): AstroIntegration {
	return {
		name: "trajectonomics:favicon-set",
		hooks: {
			"astro:config:setup": async ({ config, logger }) => {
				const source = faviconSource()
				const target = join(fileURLToPath(config.publicDir), DESTINATION)
				await mkdir(target, { recursive: true })
				for (const favicon of FAVICONS) await copyFile(join(source, favicon), join(target, favicon))
				logger.info(`copied the Favicon Set into ${DESTINATION}/`)
			},
		},
	}
}
