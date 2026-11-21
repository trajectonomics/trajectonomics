import { describe, expect, test } from "bun:test"
import { themeRole } from "./theme-role"

/** A built brand file, read as text. */
const brandFile = (path: string) =>
	Bun.file(Bun.resolveSync(`@trajectonomics/brand/current/${path}`, import.meta.dir)).text()

const light = await brandFile("light.css")
const dark = await brandFile("dark.css")

describe("a Theme role", () => {
	test("is read from the stylesheet that declares it", () => {
		expect(themeRole("--ds-color-background: #abcdef;", "background")).toBe("#abcdef")
	})

	test("a role the stylesheet does not declare stops the build", () => {
		expect(() => themeRole("--ds-color-foreground: #000;", "background")).toThrow(
			"declares no --ds-color-background",
		)
	})

	test("the brand's two Themes paint different backgrounds", () => {
		expect(themeRole(light, "background")).not.toBe(themeRole(dark, "background"))
	})
})
