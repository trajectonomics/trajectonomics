import { describe, expect, test } from "bun:test"
import { MAX_BODY_DEPTH, nestsPast } from "./depth"

/** An array nested `depth` levels deep, built with a loop so the test does not recurse either. */
function nested(depth: number): unknown {
	let value: unknown = []
	for (let level = 1; level < depth; level++) value = [value]
	return value
}

describe("nestsPast", () => {
	test("accepts a plain value, an object and a body at the limit", () => {
		expect(nestsPast("text")).toBe(false)
		expect(nestsPast(null)).toBe(false)
		expect(nestsPast({ a: [{ b: 1 }] })).toBe(false)
		expect(nestsPast(nested(MAX_BODY_DEPTH))).toBe(false)
	})

	test("refuses a body one level past the limit, and one a hundred thousand levels deep", () => {
		expect(nestsPast(nested(MAX_BODY_DEPTH + 1))).toBe(true)
		expect(nestsPast(nested(100_000))).toBe(true)
	})

	test("a flat body of a million scalars is one cheap pass", () => {
		const flat = Array.from({ length: 1_000_000 }, (_, index) => index)
		const started = performance.now()
		expect(nestsPast(flat)).toBe(false)
		expect(performance.now() - started).toBeLessThan(100)
	})

	test("counts objects and arrays alike, and an empty one as a level", () => {
		expect(nestsPast({}, 1)).toBe(false)
		expect(nestsPast([[]], 1)).toBe(true)
		expect(nestsPast({ a: { b: { c: 1 } } }, 3)).toBe(false)
		expect(nestsPast({ a: { b: { c: {} } } }, 3)).toBe(true)
	})
})
