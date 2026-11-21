import { describe, expect, it } from "bun:test"
import {
	fallbackTheme,
	isShippedTheme,
	PREVIEW_THEMES,
	PRODUCTION_THEME,
	shippedThemes,
} from "./shipped-themes"

describe("the Themes a build ships", () => {
	it("ships the dark Theme only in production, whatever the device asks for ([ADR 0016])", () => {
		expect(shippedThemes("production")).toEqual(["dark"])
		expect(PRODUCTION_THEME).toBe("dark")
	})

	it("ships both Themes in a preview build, so the light Theme can still be captured", () => {
		expect(shippedThemes("preview")).toEqual(["light", "dark"])
		expect(shippedThemes("development")).toEqual(["light", "dark"])
		expect([...PREVIEW_THEMES]).toEqual(["light", "dark"])
	})

	it("falls back to the first Theme the build ships", () => {
		expect(fallbackTheme("production")).toBe("dark")
		expect(fallbackTheme("preview")).toBe("light")
	})

	it("hands the shipped list out frozen, so a caller cannot ship a Theme at runtime", () => {
		expect(Object.isFrozen(shippedThemes("production"))).toBe(true)
		expect(Object.isFrozen(shippedThemes("preview"))).toBe(true)
		expect(Object.isFrozen(PREVIEW_THEMES)).toBe(true)
	})

	it("recognises a Theme a build ships", () => {
		expect(isShippedTheme("dark", shippedThemes("production"))).toBe(true)
	})

	it("rejects a Theme the package publishes but the build does not ship", () => {
		expect(isShippedTheme("light", shippedThemes("production"))).toBe(false)
	})
})
