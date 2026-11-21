import { describe, expect, it } from "bun:test"
import { parseDesignTokens } from "../design/tokens"
import { shareColours } from "./share-colours"

/** A published Theme CSS carrying the four roles a share image paints with, in one Theme. */
const DARK_ONLY = `[data-theme="dark"] {
	--ds-color-background: #000000;
	--ds-color-foreground: #ffffff;
	--ds-color-muted-foreground: #808080;
	--ds-color-accent: #ff0000;
}`

/** The light Theme, which a share image must never be painted from. */
const WITH_LIGHT = `${DARK_ONLY}
[data-theme="light"] {
	--ds-color-background: #ffffff;
	--ds-color-foreground: #000000;
	--ds-color-muted-foreground: #999999;
	--ds-color-accent: #00ff00;
}`

/** The tokens one published Theme CSS describes. */
function tokensOf(themes: readonly string[]) {
	return parseDesignTokens({ themes, tailwind: "" })
}

/** The code one rejected colour lookup carries. */
function codeOf(tokens: ReturnType<typeof tokensOf>): string | undefined {
	try {
		shareColours(tokens)
	} catch (error) {
		return (error as { readonly code?: string }).code
	}
	return undefined
}

describe("the colours a share image paints with", () => {
	it("reads its four roles from the Theme a production build ships", () => {
		expect(shareColours(tokensOf([DARK_ONLY]))).toEqual({
			background: "#000000",
			foreground: "#ffffff",
			mutedForeground: "#808080",
			accent: "#ff0000",
		})
	})

	it("never paints from another published Theme", () => {
		expect(shareColours(tokensOf([WITH_LIGHT])).background).toBe("#000000")
	})

	it("rejects a pinned CSS that publishes no dark Theme", () => {
		const light = '[data-theme="light"] { --ds-color-background: #ffffff; }'
		expect(codeOf(tokensOf([light]))).toBe("SHARE_THEME_MISSING")
	})

	it("rejects a Theme that publishes no colour for a role the image paints", () => {
		const withoutAccent = '[data-theme="dark"] { --ds-color-background: #000000; }'
		expect(codeOf(tokensOf([withoutAccent]))).toBe("SHARE_ROLE_MISSING")
	})
})
