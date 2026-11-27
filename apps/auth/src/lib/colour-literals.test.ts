import { describe, expect, test } from "bun:test"
import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { colourLiterals } from "./colour-literals"

/** The auth site's own stylesheets and components: everything that can paint. */
const SOURCE_ROOT = join(import.meta.dir, "..")
const PAINTING = /\.(?:css|astro|svelte)$/

describe("a colour literal", () => {
	test("a hex value is one", () => {
		expect(colourLiterals("color: #fff;")).toEqual(["#fff"])
	})

	test("a colour function is one", () => {
		expect(colourLiterals("background: oklch(0.5 0.1 30);")).toEqual(["oklch("])
	})

	test("a named colour is one", () => {
		expect(colourLiterals("color: white;")).toEqual(["white"])
	})

	test("a Theme role is not one", () => {
		expect(colourLiterals("color: var(--ds-color-foreground);")).toEqual([])
	})

	test("a colour named in a comment is not one", () => {
		expect(colourLiterals("/* never #fff */ color: var(--ds-color-ring);")).toEqual([])
	})
})

describe("the auth site's source", () => {
	const files = readdirSync(SOURCE_ROOT, { recursive: true, encoding: "utf8" }).filter((file) =>
		PAINTING.test(file),
	)

	test("has stylesheets and components to check", () => {
		expect(files.length).toBeGreaterThan(0)
	})

	test.each(files)("%s paints only from Theme roles", (file) => {
		expect(colourLiterals(readFileSync(join(SOURCE_ROOT, file), "utf8"))).toEqual([])
	})
})
