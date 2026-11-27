import { describe, expect, test } from "bun:test"
import { SiteOriginError, siteOrigin } from "./site-origin"

/** The refusal `siteOrigin` answers a build with, or `undefined` when it names one. */
function refusalOf(site: URL | undefined): { code: string; field: string } | undefined {
	try {
		siteOrigin(site)
		return undefined
	} catch (error) {
		return error instanceof SiteOriginError
			? { code: error.code, field: error.field }
			: { code: "not-a-site-origin-error", field: "" }
	}
}

describe("the Site's origin at the build boundary", () => {
	test("is the origin of the site astro.config.ts declares", () => {
		expect(siteOrigin(new URL("https://trajectonomics.com/"))).toBe("https://trajectonomics.com")
	})

	test("is refused as SITE_MISSING when the build declares no site, so no twin links absolutely", () => {
		expect(refusalOf(undefined)).toEqual({ code: "SITE_MISSING", field: "site" })
	})
})
