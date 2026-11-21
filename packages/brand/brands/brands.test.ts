import { describe, expect, it } from "bun:test"
import { readdir, readFile } from "node:fs/promises"
import { join } from "node:path"
import { inspectSvg } from "../scripts/svg-safety"
import { BRANDS_DIRECTORY, brands } from "../src/brands"
import { defineTheme } from "../src/theme/index"
import { contrastFailures, describeContrastFailure } from "../src/tokens/contrast"
import {
	COMPONENT_BOUNDARY_CONTRAST_PAIRS,
	FOCUS_INDICATOR_CONTRAST_PAIRS,
	TEXT_CONTRAST_PAIRS,
} from "../src/tokens/contrast-pairs"
import type { Theme } from "../src/tokens/theme"

/** The files every brand must ship, relative to its folder. */
const REQUIRED_ASSETS = ["assets/svg/mark.svg", "assets/svg/favicon.svg", "assets/fonts/brand.css"]
const CONTRAST_PAIRS = [
	...TEXT_CONTRAST_PAIRS,
	...FOCUS_INDICATOR_CONTRAST_PAIRS,
	...COMPONENT_BOUNDARY_CONTRAST_PAIRS,
]

async function loadTheme(brand: string, name: "light" | "dark"): Promise<Theme> {
	const module: { default?: unknown } = await import(join(BRANDS_DIRECTORY, brand, `${name}.ts`))
	return module.default as Theme
}

describe("brands", () => {
	it("contains at least one brand folder", () => {
		expect(brands().length).toBeGreaterThan(0)
	})

	for (const brand of brands()) {
		describe(brand, () => {
			it("has a light and a dark Theme, each named after its file and valid against the Contract", async () => {
				for (const name of ["light", "dark"] as const) {
					const theme = await loadTheme(brand, name)
					expect(theme.name).toBe(name)
					expect(defineTheme(theme).name).toBe(name)
				}
			})

			for (const name of ["light", "dark"] as const) {
				it(`meets the WCAG AA contrast floors in the ${name} Theme`, async () => {
					const theme = await loadTheme(brand, name)
					expect(contrastFailures(theme, CONTRAST_PAIRS).map(describeContrastFailure)).toEqual([])
				})
			}

			it("ships the required assets: logo mark, favicon and the fonts stylesheet", async () => {
				for (const asset of REQUIRED_ASSETS) {
					expect(await Bun.file(join(BRANDS_DIRECTORY, brand, asset)).exists()).toBe(true)
				}
			})

			it("ships only SVG assets that pass the safety rules", async () => {
				const directory = join(BRANDS_DIRECTORY, brand, "assets", "svg")
				for (const file of await readdir(directory)) {
					if (!file.endsWith(".svg")) continue
					expect({
						file,
						findings: inspectSvg(await readFile(join(directory, file), "utf8")),
					}).toEqual({
						file,
						findings: [],
					})
				}
			})
		})
	}
})
