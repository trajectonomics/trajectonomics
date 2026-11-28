import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { API_PATH, BASE_PATH, INGEST_PATH, LEGACY_HOST } from "../src/core/urls"

/** A JSON string, a `//` line comment, or a block comment; strings survive, comments do not. */
const JSONC_COMMENT = /("(?:\\.|[^"\\])*")|\/\/[^\n]*|\/\*[\s\S]*?\*\//g

const config = JSON.parse(
	readFileSync(join(import.meta.dir, "..", "wrangler.jsonc"), "utf8").replace(
		JSONC_COMMENT,
		(_match, string: string | undefined) => string ?? "",
	),
)

// The deploy reads this file, and the pure router reads `src/core/urls.ts`: the two must agree.
describe("the data Worker's wrangler.jsonc", () => {
	test("mounts the Worker at the base path on the apex and keeps the old host", () => {
		expect(config.routes).toEqual([
			{ pattern: `trajectonomics.com${BASE_PATH}*`, zone_name: "trajectonomics.com" },
			{ pattern: LEGACY_HOST, custom_domain: true },
		])
	})

	test("serves the build at the base path", () => {
		expect(config.assets.base_path).toBe(BASE_PATH)
	})

	test("runs the Worker first for the API, auth, ingest and the internal endpoint", () => {
		expect(config.assets.run_worker_first).toEqual([
			`${API_PATH}/*`,
			`${BASE_PATH}/auth/*`,
			INGEST_PATH,
			"/internal/*",
		])
	})

	test("configures the auth issuer ingest trusts", () => {
		expect(config.vars).toEqual({ AUTH_ISSUER: "https://auth.trajectonomics.com" })
	})
})
