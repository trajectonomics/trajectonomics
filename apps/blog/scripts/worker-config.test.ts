import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"

/** A JSON string, a `//` line comment, or a block comment; strings survive, comments do not. */
const JSONC_COMMENT = /("(?:\\.|[^"\\])*")|\/\/[^\n]*|\/\*[\s\S]*?\*\//g

const config = JSON.parse(
	readFileSync(join(import.meta.dir, "..", "wrangler.jsonc"), "utf8").replace(
		JSONC_COMMENT,
		(_match, string: string | undefined) => string ?? "",
	),
)

// The deploy reads this file and attaches the routes it names: its shape is a rule.
describe("the blog Worker", () => {
	test("is named blog, the name the deploy and the dashboard use", () => {
		expect(config.name).toBe("blog")
	})

	test("runs the script that redirects the old host", () => {
		expect(config.main).toBe("src/worker.ts")
	})

	test("owns the Site's /blog path and the old host, and no other route", () => {
		expect(config.routes).toEqual([
			{ pattern: "trajectonomics.com/blog*", zone_name: "trajectonomics.com" },
			{ pattern: "blog.trajectonomics.com", custom_domain: true },
		])
		expect(config.route).toBeUndefined()
	})

	test("serves only its named routes, so no *.workers.dev copy is published", () => {
		expect(config.workers_dev).toBe(false)
	})

	test("declares no environment, so there is one Worker to deploy", () => {
		expect(config.env).toBeUndefined()
	})

	test("serves ./dist, the build the Site's /blog path maps onto", () => {
		expect(config.assets.directory).toBe("./dist")
		expect(config.assets.base_path).toBe("/blog")
	})

	test("answers from assets without running the script first, so /blog/ costs no request", () => {
		expect(config.assets.run_worker_first).toBeUndefined()
	})

	test("binds the assets, which the script forwards every other request to", () => {
		expect(config.assets.binding).toBe("ASSETS")
	})

	test("answers an address without its slash with the slashed one, and a miss with the Not-found Page", () => {
		expect(config.assets.html_handling).toBe("auto-trailing-slash")
		expect(config.assets.not_found_handling).toBe("404-page")
	})
})
