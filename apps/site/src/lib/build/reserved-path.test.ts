import { describe, expect, it } from "bun:test"
import type { BuiltFile } from "./built-files"
import { checkReservedPreloadPath } from "./reserved-path"

function codes(files: readonly BuiltFile[]): readonly string[] {
	return checkReservedPreloadPath(files).map((failure) => failure.code)
}

describe("the Reserved preload path", () => {
	it("passes a build that leaves /__mf-preload.js unbuilt", () => {
		expect(codes([{ path: "index.html", content: "<html></html>" }])).toEqual([])
	})

	it("fails a build that produced __mf-preload.js", () => {
		expect(
			codes([
				{ path: "index.html", content: "<html></html>" },
				{ path: "__mf-preload.js", content: "console.log(1)" },
			]),
		).toEqual(["RESERVED_PRELOAD_PATH_BUILT"])
	})
})
