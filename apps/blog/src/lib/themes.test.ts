import { describe, expect, test } from "bun:test"
import { FALLBACK_THEME, THEMES, themeScript } from "./themes"

/** Runs the inline script against a stand-in device whose scheme the test sets. */
function runOnDevice(dark: boolean): { theme: string | undefined; listens: boolean } {
	let theme: string | undefined
	let listens = false
	const query = {
		matches: dark,
		addEventListener: (event: string) => {
			listens = event === "change"
		},
	}
	const window = { matchMedia: () => query }
	const document = {
		documentElement: { setAttribute: (_name: string, value: string) => (theme = value) },
	}
	new Function("window", "document", themeScript())(window, document)
	return { theme, listens }
}

describe("the Theme follows the device", () => {
	test("a dark device gets the dark Theme", () => {
		expect(runOnDevice(true).theme).toBe("dark")
	})

	test("a light device gets the light Theme", () => {
		expect(runOnDevice(false).theme).toBe("light")
	})

	test("a change of the device's scheme is followed without a reload", () => {
		expect(runOnDevice(false).listens).toBe(true)
	})

	test("the fallback, which holds with JavaScript off, is light", () => {
		expect(FALLBACK_THEME).toBe("light")
		expect(THEMES).toEqual(["light", "dark"])
	})

	test("the script stores no choice, so there is no toggle to remember", () => {
		expect(themeScript()).not.toContain("localStorage")
	})
})
