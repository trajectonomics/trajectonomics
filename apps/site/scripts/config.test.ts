import { describe, expect, it } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import astroConfig from "../astro.config"

/** A JSON string, a `//` line comment, or a block comment; string matches survive. */
const JSONC_COMMENT = /("(?:\\.|[^"\\])*")|\/\/[^\n]*|\/\*[\s\S]*?\*\//g

function stripComments(text: string): string {
	return text.replace(JSONC_COMMENT, (_match, string: string | undefined) => string ?? "")
}

interface WranglerConfig {
	readonly name?: string
	readonly compatibility_date?: string
	readonly workers_dev?: boolean
	readonly main?: string
	readonly route?: readonly unknown[]
	readonly routes?: readonly unknown[]
	readonly env?: Readonly<Record<string, unknown>>
	readonly assets?: {
		readonly directory?: string
		readonly html_handling?: string
		readonly not_found_handling?: string
	}
}

const config: WranglerConfig = JSON.parse(
	stripComments(readFileSync(join(import.meta.dir, "..", "wrangler.jsonc"), "utf8")),
)

describe("the Worker config", () => {
	it("names the Worker site, the name the router binds", () => {
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

	it("runs on workers.dev, so a local Worker starts without an account", () => {
		expect(config.workers_dev).toBe(true)
	})

	it("pins the compatibility date", () => {
		expect(config.compatibility_date).toBe("2026-11-01")
	})

	it("has no script entry", () => {
		expect(config.main).toBeUndefined()
	})

	it("attaches no route or custom domain", () => {
		expect(config.route).toBeUndefined()
		expect(config.routes).toBeUndefined()
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

	it("has no base, because the router mounts the Site at /", () => {
		expect(astroConfig.base).toBeUndefined()
	})

	it("always uses trailing slashes, so a Locale URL can be a directory", () => {
		expect(astroConfig.trailingSlash).toBe("always")
	})
})
