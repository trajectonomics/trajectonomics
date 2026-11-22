import { describe, expect, test } from "bun:test"
import { forbiddenDependencies } from "./dependencies"

describe("forbiddenDependencies", () => {
	test("refuses a Dashboard that lists React, or Astro, in either dependency map", () => {
		expect(forbiddenDependencies({ dependencies: { react: "^19.3.1" } })).toEqual(["react"])
		expect(forbiddenDependencies({ devDependencies: { "react-dom": "^19.3.1" } })).toEqual([
			"react-dom",
		])
		expect(
			forbiddenDependencies({ devDependencies: { astro: "7.4.12", "@astrojs/check": "^0.9.12" } }),
		).toEqual(["@astrojs/check", "astro"])
	})

	test("passes a Svelte 5 manifest with no React or Astro", () => {
		expect(
			forbiddenDependencies({
				dependencies: { zod: "^4.6.7" },
				devDependencies: { svelte: "^5.59.1", "@sveltejs/kit": "^3.4.0" },
			}),
		).toEqual([])
	})
})
