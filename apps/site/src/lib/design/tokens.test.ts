import { describe, expect, it } from "bun:test"
import { parseDesignTokens } from "./tokens"

const LIGHT = `[data-theme="light"] {
  --ds-color-background: #ffffff;
  --ds-color-foreground: #0a0a0a;
}`

const DARK = `[data-theme="dark"] {
  --ds-color-background: #0a0a0a;
  --ds-color-foreground: #fafafa;
}`

const TAILWIND = `@theme inline {
	--color-background: var(--ds-color-background);
	--color-foreground: var(--ds-color-foreground);
}`

function tokens(themes: readonly string[] = [LIGHT, DARK], tailwind = TAILWIND) {
	return parseDesignTokens({ themes, tailwind })
}

describe("the Themes the published CSS defines", () => {
	it("keeps each Theme's name and the value of every Semantic Token Role", () => {
		expect(tokens().themes).toEqual([
			{ name: "light", colours: { background: "#ffffff", foreground: "#0a0a0a" } },
			{ name: "dark", colours: { background: "#0a0a0a", foreground: "#fafafa" } },
		])
	})

	it("reads the minified form a build emits, which drops the quotes and the last semicolon", () => {
		const minified = "[data-theme=dark]{--ds-color-background:#0a0a0a}"
		expect(tokens([minified]).themes).toEqual([
			{ name: "dark", colours: { background: "#0a0a0a" } },
		])
	})

	it("keeps the order the CSS declares the Themes in", () => {
		expect(tokens([DARK, LIGHT]).themes.map((theme) => theme.name)).toEqual(["dark", "light"])
	})

	it("has no Theme for a CSS file with no data-theme block", () => {
		expect(tokens([":root { --ds-color-background: #fff; }"]).themes).toEqual([])
	})

	it("has no Theme for a scope that is not a Theme, such as a .dark class", () => {
		expect(tokens([".dark { --ds-color-background: #0a0a0a; }"]).themes).toEqual([])
	})

	it("leaves out a custom property that is not a Semantic Token Role", () => {
		const theme = '[data-theme="light"] { --ds-space-1: 4px; --ds-color-card: #fff; }'
		expect(tokens([theme]).themes).toEqual([{ name: "light", colours: { card: "#fff" } }])
	})
})

describe("the utility colour names the Tailwind Theme Stylesheet generates", () => {
	it("is one name per --color- declaration, so the allow-list comes from the sheet", () => {
		expect(tokens().colourUtilities).toEqual(["background", "foreground"])
	})

	it("is empty for a stylesheet with no --color- mapping", () => {
		expect(tokens([LIGHT], "@theme inline { --radius-lg: 0.5rem; }").colourUtilities).toEqual([])
	})

	it("does not take a --color- name from the Prebuilt Theme CSS", () => {
		const theme = '[data-theme="light"] { --color-white: #fff; --ds-color-card: #fff; }'
		expect(tokens([theme]).colourUtilities).toEqual(["background", "foreground"])
	})
})
