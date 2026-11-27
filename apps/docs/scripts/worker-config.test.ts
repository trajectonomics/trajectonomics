import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { declaredRoutes } from "./worker-config"

/** A JSON string, a `//` line comment, or a block comment; string matches survive, comments do not. */
const JSONC_COMMENT = /("(?:\\.|[^"\\])*")|\/\/[^\n]*|\/\*[\s\S]*?\*\//g

function stripComments(text: string): string {
	return text.replace(JSONC_COMMENT, (_match, string: string | undefined) => string ?? "")
}

// Workers Builds reads this file on every deploy, so its deploy shape is a rule, not a taste (ADR 0007).
const config = JSON.parse(
	stripComments(readFileSync(join(import.meta.dir, "..", "wrangler.jsonc"), "utf8")),
)

describe("the Worker config", () => {
	test("the Worker is named docs", () => {
		expect(config.name).toBe("docs")
	})

	test("serves the built assets from ./dist at the /docs mount", () => {
		expect(config.assets.directory).toBe("./dist")
		expect(config.assets.base_path).toBe("/docs")
	})

	test("runs this repository's Worker entry before the assets", () => {
		expect(config.main).toBe("./src/worker.ts")
	})

	test("gives the Worker an assets binding to forward to", () => {
		expect(config.assets.binding).toBe("ASSETS")
	})

	test("invokes the Worker first for every path", () => {
		expect(config.assets.run_worker_first).toBe(true)
	})

	test("serves only its custom domain, so no *.workers.dev copy is published", () => {
		expect(config.workers_dev).toBe(false)
	})

	test("declares no Wrangler environment, so there is one Worker to deploy", () => {
		expect(config.env).toBeUndefined()
	})

	test("a route set at the top level or in an environment is a declared route", () => {
		const directRoute = {
			routes: ["trajectonomics.com/docs/*"],
			env: {
				staging: { route: { pattern: "trajectonomics.com/docs", zone_name: "trajectonomics.com" } },
				production: { custom_domain: true },
			},
		}

		expect(declaredRoutes(directRoute)).toEqual([
			{ scope: "top level", key: "routes" },
			{ scope: "env.staging", key: "route" },
			{ scope: "env.production", key: "custom_domain" },
		])
	})

	test("an empty route list is not a declared route", () => {
		expect(declaredRoutes({ routes: [], env: { staging: { routes: [] } } })).toEqual([])
	})

	test("the shipped Worker serves the apex /docs route and keeps the old Docs host", () => {
		expect(config.routes).toEqual([
			{ pattern: "trajectonomics.com/docs*", zone_name: "trajectonomics.com" },
			{ pattern: "docs.trajectonomics.com", custom_domain: true },
		])
		expect(declaredRoutes(config)).toEqual([{ scope: "top level", key: "routes" }])
	})
})
