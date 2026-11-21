import { describe, expect, it } from "bun:test"
import { dictionaryFor } from "../language/languages"
import { checkDescription } from "./description"
import { codes, edited, entryAt } from "./testing/homes"

const HOME = entryAt(0).language
const OTHER = entryAt(1).language
const DESCRIPTION = dictionaryFor(HOME).description

/** The pattern of a home's one description, so a test can replace it or drop it. */
const DESCRIPTION_ELEMENT = /<meta name="description"[^>]*>/

describe("the description of a Language home", () => {
	it("passes a home that summarises itself in the Dictionary's words", () => {
		expect(codes(checkDescription)).toEqual([])
	})

	it("fails a home that carries no description at all", () => {
		expect(codes(checkDescription, edited(HOME, DESCRIPTION_ELEMENT, ""))).toEqual([
			"DESCRIPTION_MISSING",
		])
	})

	it("fails a home that carries a second description", () => {
		expect(
			codes(
				checkDescription,
				edited(HOME, /<head>/, `<head><meta name="description" content="${DESCRIPTION}">`),
			),
		).toEqual(["DESCRIPTION_DUPLICATE"])
	})

	it("fails a home that describes itself in the other Language's words", () => {
		expect(
			codes(
				checkDescription,
				edited(
					HOME,
					DESCRIPTION_ELEMENT,
					`<meta name="description" content="${dictionaryFor(OTHER).description}">`,
				),
			),
		).toEqual(["DESCRIPTION_TEXT_WRONG"])
	})

	it("fails a home whose description is empty, so nothing summarises the page", () => {
		expect(
			codes(
				checkDescription,
				edited(HOME, DESCRIPTION_ELEMENT, '<meta name="description" content="">'),
			),
		).toEqual(["DESCRIPTION_TEXT_WRONG"])
	})

	it("names the text the build wrote and the text the Dictionary states", () => {
		const [failure] = checkDescription([
			edited(HOME, DESCRIPTION_ELEMENT, '<meta name="description" content="a site">'),
		])
		expect(failure?.message).toContain("a site")
		expect(failure?.message).toContain(DESCRIPTION)
		expect(failure?.path).toBe(`/${HOME}/`)
	})
})
