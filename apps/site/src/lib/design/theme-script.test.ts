import { describe, expect, it } from "bun:test"
import { shippedThemes } from "./shipped-themes"
import { themeScript } from "./theme-script"

describe("the script that follows the device", () => {
	it("writes none while one Theme ships, so no Program JavaScript decides the Theme", () => {
		expect(themeScript(shippedThemes("production"))).toBeUndefined()
	})

	it("follows the device when both Themes ship, naming both the page may ask for", () => {
		const script = themeScript(["light", "dark"]) ?? ""
		expect(script).toContain("(prefers-color-scheme: dark)")
		expect(script).toContain('["light","dark"]')
	})

	it("keeps the Themes in the shipped order, so the first entry is the one it falls back to", () => {
		const script = themeScript(["light", "dark"]) ?? ""
		expect(script).toContain("shipped[0]")
		expect(script.indexOf('"light"')).toBeLessThan(script.indexOf('"dark"'))
	})
})
