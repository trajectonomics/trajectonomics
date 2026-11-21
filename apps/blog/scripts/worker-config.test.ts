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

// The deploy reads this file, and the router's service binding names the Worker: its shape is a rule.
describe("the blog Worker", () => {
	test("is named blog, the name the router's service binding uses", () => {
		expect(config.name).toBe("blog")
	})

	test("runs no script: it serves Static Assets only", () => {
		expect(config.main).toBeUndefined()
	})

	test("attaches no route and no custom domain, because the router reaches it", () => {
		expect(config.routes).toBeUndefined()
		expect(config.route).toBeUndefined()
		expect(JSON.stringify(config)).not.toContain("custom_domain")
	})

	test("keeps its workers.dev address, for checking a deploy before the router mounts it", () => {
		expect(config.workers_dev).toBe(true)
	})

	test("declares no environment, so there is one Worker to deploy", () => {
		expect(config.env).toBeUndefined()
	})

	test("serves ./dist, where /blog/... resolves to the build", () => {
		expect(config.assets.directory).toBe("./dist")
	})

	test("answers an address without its slash with the slashed one, and a miss with the 404 page", () => {
		expect(config.assets.html_handling).toBe("auto-trailing-slash")
		expect(config.assets.not_found_handling).toBe("404-page")
	})
})
