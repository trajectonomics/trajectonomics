import { describe, expect, test } from "bun:test"
import { join } from "node:path"
import { forbiddenDependencies } from "../src/lib/guard"

const MANIFEST = await Bun.file(join(import.meta.dir, "..", "package.json")).json()

describe("the Dashboard's dependencies", () => {
	// Turn this on (test.todo becomes test) in the step that ports the last React page and removes the
	// React and Astro packages from apps/web/package.json. While a React page is still in the tree this
	// test would fail, so it is a todo until then.
	test.todo("lists no react, react-dom, astro or @astrojs package", () => {
		expect(forbiddenDependencies(MANIFEST)).toEqual([])
	})
})
