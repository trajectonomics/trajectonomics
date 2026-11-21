import { describe, expect, test } from "bun:test"
import { SITE_ORIGIN } from "./site"

describe("the Docs Portal robots file", () => {
	test("allows the host and names its sitemap", async () => {
		const text = await Bun.file(new URL("../../public/robots.txt", import.meta.url)).text()

		expect(text).toContain("Allow: /")
		expect(text).not.toContain("Disallow:")
		expect(text).toContain(`Sitemap: ${SITE_ORIGIN}/sitemap.xml`)
	})
})
