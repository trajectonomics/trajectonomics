import { describe, expect, it } from "bun:test"
import { join } from "node:path"
import { findColourLiterals } from "../src/lib/design/colour-literals"
import { readDesignTokens } from "./adapters/design-tokens"
import { readSiteSources } from "./adapters/site-sources"

describe("the Site's own styling sources", () => {
	it("write no raw colour, only a Semantic Token Role from the published stylesheet", async () => {
		const tokens = await readDesignTokens()
		expect(findColourLiterals(await readSiteSources(), tokens.colourUtilities)).toEqual([])
	})

	it("are the styling files under src, never the published package or a copied Brand Asset", async () => {
		const sources = await readSiteSources()
		expect(sources.length).toBeGreaterThan(0)
		for (const source of sources) {
			expect(source.path.startsWith(join("src"))).toBe(true)
			expect(source.path).toMatch(/\.(astro|css|html|svg)$/)
		}
	})

	it("include the layout, so the rule reads the classes the shell is built from", async () => {
		const sources = await readSiteSources()
		expect(sources.map((source) => source.path)).toContain(join("src", "layouts", "Layout.astro"))
	})
})
