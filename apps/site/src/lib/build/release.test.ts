import { describe, expect, it } from "bun:test"
import { LLMS_FULL_FILE, LLMS_FULL_TXT } from "../crawl/llms-full"
import type { Language } from "../language/language"
import { dictionaryFor } from "../language/languages"
import { RELEASE_SNAPSHOT } from "../site/release-snapshot"
import type { BuiltFile } from "./built-files"
import { checkReleaseFacts } from "./release"
import { home, homes } from "./testing/homes"

/** A version no release will be, so a fixture that names one names another release. */
const OTHER_VERSION = "v9.9.9"

/** The version the Release snapshot prints, in its tag form. */
const TAG = `v${RELEASE_SNAPSHOT.version}`

/** The release line the English home's footer carries. */
const LINE = dictionaryFor("en").releaseLine

/** A Not-found page as the build writes it: the fallback Language's footer at the assets root. */
const NOT_FOUND: BuiltFile = { ...home("en"), path: "404.html" }

/** The full Answer engine file as the build writes it, with the pill's release line. */
const LLMS_FULL: BuiltFile = { path: LLMS_FULL_FILE, content: LLMS_FULL_TXT }

/** One Language's home with every run of `text` replaced, so a test breaks one fact at a time. */
function replaced(language: Language, text: string, replacement = ""): BuiltFile {
	const built = home(language)
	return { path: built.path, content: built.content.split(text).join(replacement) }
}

/** The codes a build reports, with one file beside the homes or standing in for one. */
function pageCodes(page: BuiltFile, beside = false): readonly string[] {
	const files = beside ? [...homes(), page] : homes(page)
	return checkReleaseFacts(files).map((failure) => failure.code)
}

describe("the release a built page names", () => {
	it("passes every home whose pill and footer name the Release snapshot's release", () => {
		expect(pageCodes(home("en"))).toEqual([])
	})

	it("passes a Not-found page, because it carries the same footer as a home", () => {
		expect(pageCodes(NOT_FOUND, true)).toEqual([])
	})

	it("passes the full Answer engine file, which derives its pill from the Dictionary", () => {
		expect(pageCodes(LLMS_FULL, true)).toEqual([])
	})

	it("fails a home that prints a version the snapshot does not name", () => {
		expect(pageCodes(home("en", `<p>${OTHER_VERSION}</p>`))).toEqual(["RELEASE_VERSION_UNKNOWN"])
	})

	it("fails a page whose version was removed, so a deleted pill or line cannot ship", () => {
		expect(pageCodes(replaced("en", TAG))).toEqual([
			"RELEASE_VERSION_MISSING",
			"RELEASE_LINE_NOT_NAMED",
		])
	})

	it("fails a footer that names another version, so the pill and the footer cannot disagree", () => {
		expect(pageCodes(replaced("en", TAG, OTHER_VERSION))).toEqual([
			"RELEASE_VERSION_UNKNOWN",
			"RELEASE_LINE_NOT_NAMED",
		])
	})

	it("fails a Not-found page that names another version", () => {
		const content = NOT_FOUND.content.replace("</main>", `<p>${OTHER_VERSION}</p></main>`)
		expect(pageCodes({ ...NOT_FOUND, content }, true)).toEqual(["RELEASE_VERSION_UNKNOWN"])
	})

	it("fails the Answer engine file that names another version", () => {
		const page = { path: LLMS_FULL_FILE, content: LLMS_FULL_TXT.split(TAG).join(OTHER_VERSION) }
		expect(pageCodes(page, true)).toEqual(["RELEASE_VERSION_UNKNOWN"])
	})

	it("fails a footer that does not print the Dictionary's release line", () => {
		const built = home("en", `<p>${TAG}</p>`)
		const without = { path: built.path, content: built.content.split(LINE).join("") }
		expect(pageCodes(without)).toEqual(["RELEASE_LINE_NOT_NAMED"])
	})

	it("fails a footer whose date text is not the release day the Dictionary writes", () => {
		expect(pageCodes(replaced("en", dictionaryFor("en").releaseDate, "1 Jan 2020"))).toEqual([
			"RELEASE_DATE_TEXT_NOT_NAMED",
		])
	})

	it("fails a footer whose machine date is not the snapshot's release day", () => {
		expect(
			pageCodes(
				replaced("en", `datetime="${RELEASE_SNAPSHOT.releasedOn}"`, `datetime="2020-01-01"`),
			),
		).toEqual(["RELEASE_DATE_MISMATCH"])
	})

	it("fails a footer that names no release day at all, once for each rule it breaks", () => {
		const page = replaced("en", `<time datetime="${RELEASE_SNAPSHOT.releasedOn}">`)
		expect(pageCodes(page)).toEqual(["RELEASE_DATE_TEXT_NOT_NAMED", "RELEASE_DATE_MISMATCH"])
	})

	it("leaves a page with no footer to the landmark rule, which owns that failure", () => {
		expect(pageCodes(replaced("en", "<footer>"))).toEqual([])
	})
})
