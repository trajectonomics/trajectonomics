import { describe, expect, it } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import astroConfig from "../astro.config"

/** A JSON string, a `//` line comment, or a block comment; string matches survive. */
const JSONC_COMMENT = /("(?:\\.|[^"\\])*")|\/\/[^\n]*|\/\*[\s\S]*?\*\//g

function stripComments(text: string): string {
	return text.replace(JSONC_COMMENT, (_match, string: string | undefined) => string ?? "")
}

interface WranglerRoute {
	readonly pattern?: string
	readonly custom_domain?: boolean
}

interface WranglerConfig {
	readonly name?: string
	readonly compatibility_date?: string
	readonly workers_dev?: boolean
	readonly main?: string
	readonly route?: readonly unknown[]
	readonly routes?: readonly WranglerRoute[]
	readonly env?: Readonly<Record<string, unknown>>
	readonly assets?: {
		readonly directory?: string
		readonly binding?: string
		readonly run_worker_first?: readonly string[] | boolean
		readonly html_handling?: string
		readonly not_found_handling?: string
	}
}

const config: WranglerConfig = JSON.parse(
	stripComments(readFileSync(join(import.meta.dir, "..", "wrangler.jsonc"), "utf8")),
)

describe("the Worker config", () => {
	it("names the Worker site, the Worker the apex Custom Domain belongs to", () => {
		expect(config.name).toBe("site")
	})

	it("serves the build at the assets root", () => {
		expect(config.assets?.directory).toBe("./dist")
	})

	it("answers an unknown path with the Not-found page", () => {
		expect(config.assets?.not_found_handling).toBe("404-page")
	})

	it("keeps trailing slashes canonical", () => {
		expect(config.assets?.html_handling).toBe("auto-trailing-slash")
	})

	it("serves only its custom domain, so no *.workers.dev copy is published", () => {
		expect(config.workers_dev).toBe(false)
	})

	it("pins the compatibility date", () => {
		expect(config.compatibility_date).toBe("2026-11-01")
	})

	it("runs the Worker first for each page address and the old prefixes, and nowhere else", () => {
		expect(config.main).toBe("src/worker/index.ts")
		expect(config.assets?.binding).toBe("ASSETS")
		expect(config.assets?.run_worker_first).toEqual([
			"/",
			"/en",
			"/en/*",
			"/th",
			"/th/*",
			"/openjot",
			"/openjot/",
		])
	})

	it("declares the apex as its Custom Domain, the attachment the deploy must keep", () => {
		expect(config.route).toBeUndefined()
		expect(config.routes).toEqual([{ pattern: "trajectonomics.com", custom_domain: true }])
	})

	it("has no staging environment", () => {
		expect(config.env).toBeUndefined()
	})
})

describe("the Astro config", () => {
	it("builds static pages", () => {
		expect(astroConfig.output).toBe("static")
	})

	it("builds into the assets root the Worker serves", () => {
		expect(astroConfig.outDir).toBe("./dist")
	})

	it("has no base, because the Site owns / on its own host", () => {
		expect(astroConfig.base).toBeUndefined()
	})

	it("always uses trailing slashes, so a Language build path can be a directory", () => {
		expect(astroConfig.trailingSlash).toBe("always")
	})
})
