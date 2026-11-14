import { describe, expect, it } from "bun:test"
import { dictionaryFor } from "../language/languages"
import { checkPageText } from "./page-text"
import { heroCodes, heroHome } from "./testing/hero"

describe("the text a Language home renders", () => {
	it("passes every home, whose headline, sub-line and disclaimer are its Dictionary's", () => {
		expect(heroCodes(checkPageText)).toEqual([])
	})

	it("fails a home whose hero shows a different headline", () => {
		expect(heroCodes(checkPageText, heroHome("en", { headline: "Another claim." }))).toEqual([
			"HEADLINE_NOT_RENDERED",
		])
	})

	it("fails a home whose hero lost one of the phrases the headline cycles", () => {
		const held = dictionaryFor("en").heroHeading
		expect(heroCodes(checkPageText, heroHome("en", { headline: `<span>${held}</span>` }))).toEqual([
			"HEADLINE_NOT_RENDERED",
		])
	})

	it("fails a home whose sub-line is not the one the Dictionary names", () => {
		expect(heroCodes(checkPageText, heroHome("en", { subline: "Something shorter." }))).toEqual([
			"SUBLINE_NOT_RENDERED",
		])
	})

	it("fails a home whose footer lost its disclaimer", () => {
		expect(heroCodes(checkPageText, heroHome("en", { disclaimer: "" }))).toEqual([
			"DISCLAIMER_NOT_RENDERED",
		])
	})
})
