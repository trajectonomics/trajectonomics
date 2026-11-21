import { describe, expect, it } from "bun:test"
import { jsonDifferences } from "./json-difference"

/** The paths two values differ at, so a test names where and not how the walk got there. */
function paths(stated: unknown, written: unknown): readonly string[] {
	return jsonDifferences(stated, written).map((difference) => difference.at)
}

describe("the paths at which two JSON values differ", () => {
	it("names no path when the two agree, nested objects and arrays included", () => {
		expect(paths({ a: 1, b: [1, { c: "x" }] }, { a: 1, b: [1, { c: "x" }] })).toEqual([])
	})

	it("names a value's own path when a scalar differs", () => {
		expect(paths({ inLanguage: "en" }, { inLanguage: "th" })).toEqual(["inLanguage"])
	})

	it("names the array index a value sits at", () => {
		expect(paths({ graph: [{ url: "a" }] }, { graph: [{ url: "b" }] })).toEqual(["graph.0.url"])
	})

	it("names a key the written value leaves out, with no value on that side", () => {
		const [difference] = jsonDifferences({ a: { b: 1 } }, { a: {} })
		expect(difference?.at).toBe("a.b")
		expect(difference?.stated).toBe(1)
		expect(difference?.written).toBeUndefined()
	})

	it("names a key the written value adds, so a property the block must not state is caught", () => {
		expect(paths({ a: 1 }, { a: 1, logo: "x" })).toEqual(["logo"])
	})

	it("names the whole value when the two are not the same kind", () => {
		expect(paths({ a: 1 }, [1])).toEqual([""])
		expect(paths({ a: "1" }, { a: 1 })).toEqual(["a"])
		expect(paths({ a: null }, { a: undefined })).toEqual(["a"])
	})

	it("names every path that differs, not only the first", () => {
		expect(paths({ a: 1, b: 2 }, { a: 0, b: 0 })).toEqual(["a", "b"])
	})
})
