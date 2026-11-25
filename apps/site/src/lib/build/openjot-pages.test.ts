import { describe, expect, it } from "bun:test"
import { OPENJOT_LANGUAGES, openJotBuildFile } from "../language/openjot-dictionary"
import type { BuiltFile } from "./built-files"
import { checkOpenJotPages } from "./openjot-pages"

/** The two OpenJot pages a healthy build writes, each declaring its Language. */
function pages(): readonly BuiltFile[] {
	return OPENJOT_LANGUAGES.map((entry) => ({
		path: openJotBuildFile(entry.language),
		content: `<html lang="${entry.language}"><body></body></html>`,
	}))
}

/** The distinct codes the check reports, so a test names the condition. */
function codes(files: readonly BuiltFile[]): readonly string[] {
	return checkOpenJotPages(files).map((failure) => failure.code)
}

describe("the OpenJot page's two build files", () => {
	it("passes a build that wrote both Languages", () => {
		expect(codes(pages())).toEqual([])
	})

	it("fails a build that wrote no Thai page", () => {
		const thai = openJotBuildFile("th")
		expect(codes(pages().filter((file) => file.path !== thai))).toEqual(["OPENJOT_PAGE_MISSING"])
	})

	it("fails a page that declares another Language", () => {
		const [first, ...rest] = pages()
		if (first === undefined) throw new Error("the Site speaks no Language")
		expect(codes([{ ...first, content: '<html lang="xx">' }, ...rest])).toEqual([
			"LANGUAGE_NOT_DECLARED",
		])
	})
})
