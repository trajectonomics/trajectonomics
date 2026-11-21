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

describe("the browser bar the Site's shipped Themes paint", () => {
	it("paints one bar at the shipped Theme's background, with no device scheme to follow", () => {
		expect(themePaints(PUBLISHED, ["dark"])).toEqual([
			{ theme: "dark", media: undefined, colour: "#0a0a0a" },
		])
	})

	it("paints one bar per Theme with its own device query when both Themes ship", () => {
		expect(themePaints(PUBLISHED, ["light", "dark"])).toEqual([
			{ theme: "light", media: "(prefers-color-scheme: light)", colour: "#ffffff" },
			{ theme: "dark", media: "(prefers-color-scheme: dark)", colour: "#0a0a0a" },
		])
	})

	it("leaves out a published Theme the Site does not ship, so no bar claims a look", () => {
		expect(themePaints(PUBLISHED, ["dark"]).map((paint) => paint.theme)).toEqual(["dark"])
	})

	it("leaves out a shipped Theme that publishes no background colour", () => {
		const noBackground = themes('[data-theme="dark"] { --ds-color-foreground: #fafafa; }')
		expect(themePaints(noBackground, ["dark"])).toEqual([])
	})

	it("follows the published value, so a Theme change moves the bar with it", () => {
		const restyled = themes('[data-theme="dark"] { --ds-color-background: #111111; }')
		expect(themePaints(restyled, ["dark"]).map((paint) => paint.colour)).toEqual(["#111111"])
	})

	it("hands every paint out frozen, so a caller cannot edit what the page carries", () => {
		const [paint] = themePaints(PUBLISHED, ["dark"])
		expect(Object.isFrozen(paint)).toBe(true)
	})
})
