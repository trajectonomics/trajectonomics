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

// The deploy reads this file and attaches the domain it names: its shape is a rule.
describe("the blog Worker", () => {
	test("is named blog, the name the deploy and the dashboard use", () => {
		expect(config.name).toBe("blog")
	})

	test("runs no script: it serves Static Assets only", () => {
		expect(config.main).toBeUndefined()
	})

	test("owns blog.trajectonomics.com as a custom domain, and no other route", () => {
		expect(config.routes).toEqual([{ pattern: "blog.trajectonomics.com", custom_domain: true }])
		expect(config.route).toBeUndefined()
	})

	test("serves only its custom domain, so no *.workers.dev copy is published", () => {
		expect(config.workers_dev).toBe(false)
	})

	test("declares no environment, so there is one Worker to deploy", () => {
		expect(config.env).toBeUndefined()
	})

	test("serves ./dist, the root of its host", () => {
		expect(config.assets.directory).toBe("./dist")
	})

	test("answers an address without its slash with the slashed one, and a miss with the Not-found Page", () => {
		expect(config.assets.html_handling).toBe("auto-trailing-slash")
		expect(config.assets.not_found_handling).toBe("404-page")
	})
})
