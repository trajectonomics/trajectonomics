import { describe, expect, test } from "bun:test"
import { join } from "node:path"
import { forbiddenDependencies } from "../src/lib/guard"

const MANIFEST = await Bun.file(join(import.meta.dir, "..", "package.json")).json()

describe("the Dashboard's dependencies", () => {
	test("lists no react, react-dom, astro or @astrojs package", () => {
		expect(forbiddenDependencies(MANIFEST)).toEqual([])
	})
})
