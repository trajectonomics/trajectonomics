import { describe, expect, it } from "bun:test"
import { themePaints } from "./theme-paint"
import { parseDesignTokens } from "./tokens"

/** A published Theme CSS sheet with one role, so a test names the Theme it changes. */
function themes(...blocks: readonly string[]) {
	return parseDesignTokens({ themes: blocks, tailwind: "" })
}

/** The two Themes the design system publishes at the version the Site pins. */
const PUBLISHED = themes(
	'[data-theme="light"] { --ds-color-background: #ffffff; }',
	'[data-theme="dark"] { --ds-color-background: #0a0a0a; }',
)

describe("the browser bar each published Theme paints", () => {
	it("takes the background role, the surface the fixed header paints", () => {
		expect(themePaints(PUBLISHED)).toEqual([
			{ theme: "light", media: "(prefers-color-scheme: light)", colour: "#ffffff" },
			{ theme: "dark", media: "(prefers-color-scheme: dark)", colour: "#0a0a0a" },
		])
	})

	it("orders the paints light first, so the no-JavaScript fallback is the first one written", () => {
		const reversed = themes(
			'[data-theme="dark"] { --ds-color-background: #0a0a0a; }',
			'[data-theme="light"] { --ds-color-background: #ffffff; }',
		)
		expect(themePaints(reversed).map((paint) => paint.theme)).toEqual(["light", "dark"])
	})

	it("leaves out a Theme the device has no scheme for, so no bar claims a look", () => {
		const withSepia = themes(
			'[data-theme="light"] { --ds-color-background: #ffffff; }',
			'[data-theme="sepia"] { --ds-color-background: #f4ecd8; }',
		)
		expect(themePaints(withSepia).map((paint) => paint.theme)).toEqual(["light"])
	})

	it("leaves out a Theme that publishes no background colour", () => {
		const noBackground = themes('[data-theme="light"] { --ds-color-foreground: #0a0a0a; }')
		expect(themePaints(noBackground)).toEqual([])
	})

	it("follows the published value, so a Theme change moves the bar with it", () => {
		const restyled = themes('[data-theme="dark"] { --ds-color-background: #111111; }')
		expect(themePaints(restyled).map((paint) => paint.colour)).toEqual(["#111111"])
	})

	it("hands every paint out frozen, so a caller cannot edit what the page carries", () => {
		const [paint] = themePaints(PUBLISHED)
		expect(Object.isFrozen(paint)).toBe(true)
	})
})
