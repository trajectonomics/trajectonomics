import { describe, expect, it } from "bun:test"
import { checkLanguageHomes } from "./language-home"
import { codes, edited, entryAt, homes } from "./testing/homes"

describe("the Language homes", () => {
	it("passes a home per Language, each declaring its own Language", () => {
		expect(codes(checkLanguageHomes)).toEqual([])
	})

	it("fails a Language with no home", () => {
		const missing = entryAt(0)
		const files = homes().filter((file) => file.path !== `${missing.language}/index.html`)
		expect(checkLanguageHomes(files).map((failure) => failure.code)).toEqual([
			"LANGUAGE_HOME_MISSING",
		])
	})

	it("fails a home that declares another Language", () => {
		const page = edited(entryAt(0).language, /lang="[^"]*"/, 'lang="xx"')
		expect(codes(checkLanguageHomes, page)).toEqual(["LANGUAGE_NOT_DECLARED"])
	})
})
