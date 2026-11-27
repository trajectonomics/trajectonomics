import { describe, expect, it } from "bun:test"
import { BLOG_PATH, DATA_PATH, DOCS_PATH } from "../site"
import type { BuiltFile } from "./built-files"
import { checkReservedPaths } from "./reserved-path"

function codes(files: readonly BuiltFile[]): readonly string[] {
	return checkReservedPaths(files).map((failure) => failure.code)
}

const HOME: BuiltFile = { path: "index.html", content: "<html></html>" }

describe("the Reserved preload path", () => {
	it("passes a build that leaves /__mf-preload.js unbuilt", () => {
		expect(codes([HOME])).toEqual([])
	})

	it("fails a build that produced __mf-preload.js", () => {
		expect(codes([HOME, { path: "__mf-preload.js", content: "console.log(1)" }])).toEqual([
			"RESERVED_PRELOAD_PATH_BUILT",
		])
	})
})

describe("the paths another Worker's zone route mounts", () => {
	for (const mount of [DOCS_PATH, BLOG_PATH, DATA_PATH]) {
		const directory = mount.replace(/^\/|\/$/g, "")

		it(`fails a build that produced a page under ${mount}`, () => {
			expect(codes([HOME, { path: `${directory}/index.html`, content: "<html></html>" }])).toEqual([
				"RESERVED_MOUNT_PATH_BUILT",
			])
		})

		it(`fails a build that produced a file under ${mount}`, () => {
			expect(codes([HOME, { path: `${directory}/sitemap.xml`, content: "<urlset/>" }])).toEqual([
				"RESERVED_MOUNT_PATH_BUILT",
			])
		})
	}

	it("passes a path that only starts with a reserved name", () => {
		expect(
			codes([
				HOME,
				{ path: "documents/index.html", content: "<html></html>" },
				{ path: "blogroll.html", content: "<html></html>" },
				{ path: "database.json", content: "{}" },
			]),
		).toEqual([])
	})
})
