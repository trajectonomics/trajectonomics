import { describe, expect, it } from "bun:test"
import { dictionaryFor } from "../language/languages"
import { checkDocumentTitle } from "./document-title"
import { codes, edited, entryAt } from "./testing/homes"

const HOME = entryAt(0).language
const TITLE = dictionaryFor(HOME).documentTitle

/** The pattern of a home's one title, so a test can replace its text or drop it. */
const TITLE_ELEMENT = /<title\b[^>]*>[\s\S]*?<\/title>/

describe("the document title of a Language home", () => {
	it("passes a home whose title is the Dictionary's text", () => {
		expect(codes(checkDocumentTitle)).toEqual([])
	})

	it("fails a home that carries no title at all", () => {
		expect(codes(checkDocumentTitle, edited(HOME, TITLE_ELEMENT, ""))).toEqual(["TITLE_MISSING"])
	})

	it("fails a home that carries a second title", () => {
		expect(
			codes(checkDocumentTitle, edited(HOME, /<head>/, `<head><title>${TITLE}</title>`)),
		).toEqual(["TITLE_DUPLICATE"])
	})

	it("fails a home that titles itself with the bare brand word", () => {
		expect(
			codes(checkDocumentTitle, edited(HOME, TITLE_ELEMENT, "<title>trajectonomics</title>")),
		).toEqual(["TITLE_TEXT_WRONG"])
	})

	it("names the text the build wrote and the text the Dictionary states", () => {
		const [failure] = checkDocumentTitle([
			edited(HOME, TITLE_ELEMENT, "<title>trajectonomics</title>"),
		])
		expect(failure?.message).toContain("trajectonomics")
		expect(failure?.message).toContain(TITLE)
		expect(failure?.path).toBe(`/${HOME}/`)
	})

	it("judges each Language home in its own Language", () => {
		const other = entryAt(1).language
		expect(
			codes(checkDocumentTitle, edited(other, TITLE_ELEMENT, `<title>${TITLE}</title>`)),
		).toEqual(["TITLE_TEXT_WRONG"])
	})
})
