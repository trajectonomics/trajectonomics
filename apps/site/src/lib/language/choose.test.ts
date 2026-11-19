import { describe, expect, it } from "bun:test"
import { chooseLanguage } from "./choose"
import type { Language } from "./language"

/** One request's Visitor signals, and the Language the Site must answer with. */
interface Case {
	readonly acceptLanguage: string | null
	readonly country: string | null
	readonly expected: Language
	readonly why: string
}

const CASES: readonly Case[] = [
	{ acceptLanguage: "th", country: null, expected: "th", why: "Thai asked for" },
	{ acceptLanguage: "th-TH", country: null, expected: "th", why: "a regional Thai tag" },
	{ acceptLanguage: "TH", country: null, expected: "th", why: "a tag in another letter case" },
	{ acceptLanguage: "en", country: "TH", expected: "en", why: "English beats the country" },
	{ acceptLanguage: "en-GB", country: "TH", expected: "en", why: "a regional English tag" },
	{
		acceptLanguage: "en-US,en;q=0.9",
		country: "TH",
		expected: "en",
		why: "a browser's English list",
	},
	{
		acceptLanguage: "fr",
		country: "TH",
		expected: "th",
		why: "Thai from Thailand, unsupported asked",
	},
	{
		acceptLanguage: "fr",
		country: null,
		expected: "en",
		why: "English when nothing says otherwise",
	},
	{
		acceptLanguage: "de;q=1,th;q=0.2",
		country: "TH",
		expected: "th",
		why: "the only supported tag",
	},
	{
		acceptLanguage: "th,en",
		country: null,
		expected: "th",
		why: "the first of two equal qualities",
	},
	{
		acceptLanguage: "en,th",
		country: null,
		expected: "en",
		why: "the first of two equal qualities",
	},
	{ acceptLanguage: "en;q=0.8,th;q=0.8", country: "TH", expected: "en", why: "the first of a tie" },
	{ acceptLanguage: "th;q=0.3,en;q=0.8", country: null, expected: "en", why: "the higher quality" },
	{ acceptLanguage: "th;q=0", country: "TH", expected: "en", why: "an explicit rejection of Thai" },
	{ acceptLanguage: "th;q=0,en;q=0.5", country: "TH", expected: "en", why: "English already won" },
	{ acceptLanguage: "th;q=0.0", country: null, expected: "en", why: "a rejection with no country" },
	{
		acceptLanguage: "th-TH;q=0",
		country: "TH",
		expected: "en",
		why: "a rejected regional Thai tag",
	},
	{ acceptLanguage: "*", country: "TH", expected: "th", why: "a wildcard names no Language" },
	{ acceptLanguage: "*", country: null, expected: "en", why: "a wildcard names no Language" },
	{ acceptLanguage: "*;q=0", country: "TH", expected: "th", why: "a wildcard cannot reject Thai" },
	{ acceptLanguage: "", country: "TH", expected: "th", why: "an empty header is no signal" },
	{ acceptLanguage: null, country: "TH", expected: "th", why: "a missing header is no signal" },
	{ acceptLanguage: null, country: "th", expected: "th", why: "a country in another letter case" },
	{ acceptLanguage: null, country: "XX", expected: "en", why: "an unknown country" },
	{ acceptLanguage: null, country: "T1", expected: "en", why: "an anonymised country" },
	{ acceptLanguage: null, country: null, expected: "en", why: "no signal at all" },
]

describe("the Language a Visitor signal chooses", () => {
	for (const testCase of CASES) {
		const header = testCase.acceptLanguage ?? "no header"
		const country = testCase.country ?? "no header"
		it(`${header} with ${country} gives ${testCase.expected}, because ${testCase.why}`, () => {
			expect(chooseLanguage(undefined, testCase.acceptLanguage, testCase.country)).toBe(
				testCase.expected,
			)
		})
	}

	it("tolerates the whitespace a browser may send", () => {
		expect(chooseLanguage(undefined, " th ; q=0 ", "TH")).toBe("en")
		expect(chooseLanguage(undefined, " en , th ; q=0.4 ", null)).toBe("en")
	})

	it("gives the same answer every time, so a cache may not store it", () => {
		expect(chooseLanguage(undefined, "fr", "TH")).toBe(chooseLanguage(undefined, "fr", "TH"))
	})
})

describe("the Language the visitor stored", () => {
	it("beats a browser that asks for the other Language", () => {
		expect(chooseLanguage("th", "en", null)).toBe("th")
		expect(chooseLanguage("en", "th", "TH")).toBe("en")
	})

	it("beats the country when the visitor stored English in Thailand", () => {
		expect(chooseLanguage("en", null, "TH")).toBe("en")
	})

	it("leaves the Visitor signals to choose when the visitor stored nothing", () => {
		expect(chooseLanguage(undefined, null, "TH")).toBe("th")
	})
})
