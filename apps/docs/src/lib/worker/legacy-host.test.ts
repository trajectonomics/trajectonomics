import { describe, expect, test } from "bun:test"
import { SITE_ORIGIN } from "../site"
import { DOCS_BASE_PATH } from "../tabs"
import { LEGACY_HOST, legacyHostLocation } from "./legacy-host"

function location(url: string): string | null {
	return legacyHostLocation(new URL(url))
}

const PORTAL = `${SITE_ORIGIN}${DOCS_BASE_PATH}`

describe("the old Docs host", () => {
	test("the root moves to the Portal's Landing Page", () => {
		expect(location(`https://${LEGACY_HOST}/`)).toBe(`${PORTAL}/`)
		expect(location(`https://${LEGACY_HOST}`)).toBe(`${PORTAL}/`)
	})

	test("a deep page keeps its path and its query under the Site's /docs mount", () => {
		expect(location(`https://${LEGACY_HOST}/cli/commands/tx/?q=1`)).toBe(
			`${PORTAL}/cli/commands/tx/?q=1`,
		)
		expect(location(`https://${LEGACY_HOST}/llms.txt`)).toBe(`${PORTAL}/llms.txt`)
	})

	test("a path that already carries the base is not prefixed twice", () => {
		expect(location(`https://${LEGACY_HOST}/docs`)).toBe(`${PORTAL}`)
		expect(location(`https://${LEGACY_HOST}/docs/cli/`)).toBe(`${PORTAL}/cli/`)
	})

	test("a retired path resolves to its final target in the same redirect", () => {
		expect(location(`https://${LEGACY_HOST}/developers/tax-core`)).toBe(`${PORTAL}/contribute/tax/`)
		expect(location(`https://${LEGACY_HOST}/developers/sim-core/`)).toBe(`${PORTAL}/contribute/`)
		expect(location(`https://${LEGACY_HOST}/docs/developers/sim-core/`)).toBe(
			`${PORTAL}/contribute/`,
		)
	})

	test("a request on another host stays put", () => {
		expect(location(`${SITE_ORIGIN}/docs/cli/`)).toBeNull()
		expect(location("http://localhost/docs/cli/")).toBeNull()
		expect(location(`${SITE_ORIGIN}/developers/tax-core`)).toBeNull()
	})
})
