import { describe, expect, test } from "bun:test"
import { pageShare, SHARE_IMAGE_URL } from "./head-tags"
import { PORTAL_PURPOSE } from "./portal"
import { SITE_ORIGIN } from "./site"

describe("the share of a Docs Portal page", () => {
	test("a deep page's URL is its absolute address with one trailing slash", () => {
		expect(pageShare("/cli/install", "Install", "Install traj.").url).toBe(
			`${SITE_ORIGIN}/cli/install/`,
		)
	})

	test("the landing page's URL is the origin's root", () => {
		expect(pageShare("/", "Trajectonomics Docs", undefined).url).toBe(`${SITE_ORIGIN}/`)
	})

	test("a page with no description shares the Portal's own sentence", () => {
		expect(pageShare("/cli/", "CLI", undefined).description).toBe(PORTAL_PURPOSE)
	})

	test("every page shares the Site's social image, not a Docs image of its own", () => {
		expect(SHARE_IMAGE_URL).toBe("https://trajectonomics.com/og/en.png")
		expect(pageShare("/cli/", "CLI", "x").image).toBe(SHARE_IMAGE_URL)
	})
})
