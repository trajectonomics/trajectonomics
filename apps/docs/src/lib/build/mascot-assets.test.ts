import { describe, expect, test } from "bun:test"
import type { BuiltFile } from "./built-files"
import type { BuildFailure } from "./failures"
import { checkMascotAssets } from "./mascot-assets"

function page(content: string): BuiltFile {
	return { path: "index.html", content }
}

function codesOf(files: readonly BuiltFile[]): readonly BuildFailure["code"][] {
	return checkMascotAssets(files).map((failure) => failure.code)
}

describe("the Mascot files of the built Docs Portal", () => {
	test("a page that points at a drawn Mascot reports no failure", () => {
		const files = [
			page('<img src="/docs/mascot/peek.webp" alt="">'),
			{ path: "mascot/peek.webp", content: "" },
		]
		expect(codesOf(files)).toEqual([])
	})

	test("a page that points at a Mascot the build does not contain is reported", () => {
		const failures = checkMascotAssets([page('<img src="/docs/mascot/wave.webp" alt="">')])
		expect(failures).toEqual([
			{
				code: "MASCOT_ASSET_MISSING",
				path: "index.html",
				message: "the page points at /docs/mascot/wave.webp, which the build does not contain",
			},
		])
	})

	test("the 404 page is a built page too, so its Mascot is checked", () => {
		const failures = checkMascotAssets([
			{ path: "404.html", content: '<img src="/docs/mascot/lost.webp" alt="">' },
		])
		expect(failures.map((failure) => failure.path)).toEqual(["404.html"])
	})

	test("the same missing file named twice on one page is reported once", () => {
		const content = '<img src="/docs/mascot/lost.webp"><img src="/docs/mascot/lost.webp">'
		expect(checkMascotAssets([page(content)])).toHaveLength(1)
	})

	test("a Mascot URL outside the Portal's base is another site's, and is left alone", () => {
		expect(codesOf([page('<img src="/mascot/peek.webp" alt="">')])).toEqual([])
	})

	test("a file that is not a built page is not asked for Mascots", () => {
		expect(codesOf([{ path: "index.md", content: '<img src="/docs/mascot/peek.webp">' }])).toEqual(
			[],
		)
	})
})
