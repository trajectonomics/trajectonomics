import { describe, expect, it } from "bun:test"
import { mkdtemp, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import darkTheme from "../brands/trajectonomics/dark"
import lightTheme from "../brands/trajectonomics/light"
import { themeToCss } from "../src/theme/index"
import { assertBrandExists, buildBrands, selectedBrand, writeBrand } from "./build"

const PACKAGE_ROOT = join(import.meta.dir, "..")
const TRAJECTONOMICS = join(PACKAGE_ROOT, "brands", "trajectonomics")

describe("brand build", () => {
	it("writes the light and dark Theme CSS that themeToCss emits for the brand's Themes", async () => {
		const output = await mkdtemp(join(tmpdir(), "brand-build-"))
		try {
			await writeBrand(TRAJECTONOMICS, output)
			expect(await readFile(join(output, "light.css"), "utf8")).toBe(themeToCss(lightTheme))
			expect(await readFile(join(output, "dark.css"), "utf8")).toBe(themeToCss(darkTheme))
			expect(await Bun.file(join(output, "logo", "mark.svg")).exists()).toBe(true)
			expect(await Bun.file(join(output, "fonts", "inter.css")).exists()).toBe(true)
		} finally {
			await rm(output, { recursive: true, force: true })
		}
	})

	it("selects the default brand when BRAND is unset or empty", () => {
		expect(selectedBrand({})).toBe("trajectonomics")
		expect(selectedBrand({ BRAND: "" })).toBe("trajectonomics")
		expect(selectedBrand({ BRAND: "acme" })).toBe("acme")
	})

	it("fails with the list of brands when BRAND names no brand folder", () => {
		expect(() => assertBrandExists("nope", ["trajectonomics", "acme"])).toThrow(
			"BRAND=nope is not a brand",
		)
	})

	it("mirrors the selected brand into dist/current and copies the shared stylesheets", async () => {
		const dist = await mkdtemp(join(tmpdir(), "brand-dist-"))
		try {
			await buildBrands(PACKAGE_ROOT, "trajectonomics", dist)
			expect(await readFile(join(dist, "current", "light.css"), "utf8")).toBe(
				themeToCss(lightTheme),
			)
			expect(await readFile(join(dist, "tailwind.css"), "utf8")).toBe(
				await readFile(join(PACKAGE_ROOT, "tailwind.css"), "utf8"),
			)
			expect(await Bun.file(join(dist, "typography.css")).exists()).toBe(true)
		} finally {
			await rm(dist, { recursive: true, force: true })
		}
	})
})
