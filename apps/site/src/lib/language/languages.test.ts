import { describe, expect, it } from "bun:test"
import { SITE_ORIGIN } from "../site"
import { FALLBACK_LANGUAGE } from "./language"
import {
	ABSOLUTE_CLEAN_URL,
	CLEAN_URL,
	dictionaryFor,
	LANGUAGES,
	languageChoiceLink,
	languageEntry,
	languageHomeFile,
	languageHomePath,
	otherLanguages,
	spokenLanguage,
} from "./languages"

/** The code of the error `run` throws, or what it did instead. */
function codeOf(run: () => unknown): string {
	try {
		run()
	} catch (error) {
		return (error as { readonly code?: string }).code ?? "no code"
	}
	return "no error"
}

describe("the Languages the Site speaks", () => {
	it("gives every Language exactly one entry, with its own code", () => {
		const codes = LANGUAGES.map((entry) => entry.language)
		expect(new Set(codes).size).toBe(codes.length)
	})

	it("gives each Language a territory-qualified og:locale", () => {
		for (const entry of LANGUAGES) {
			expect(entry.locale).toMatch(/^[a-z]{2}_[A-Z]{2}$/)
		}
	})

	it("names a Language the Site speaks as the fallback", () => {
		expect(languageEntry(FALLBACK_LANGUAGE).language).toBe(FALLBACK_LANGUAGE)
	})

	it("serves English when no Visitor signal chooses", () => {
		expect(FALLBACK_LANGUAGE).toBe("en")
	})

	it("gives every country code to exactly one Language, in upper case", () => {
		const claimed = LANGUAGES.flatMap((entry) =>
			entry.countries.map((country) => ({ country, language: entry.language })),
		)
		expect(new Set(claimed.map((claim) => claim.country)).size).toBe(claimed.length)
		for (const { country } of claimed) {
			expect(country).toBe(country.toUpperCase())
		}
	})

	it("gives Thailand to Thai", () => {
		expect(languageEntry("th").countries).toEqual(["TH"])
	})

	it("gives the fallback Language no country, so a country never selects it", () => {
		expect(languageEntry(FALLBACK_LANGUAGE).countries).toEqual([])
	})

	it("gives each Language a home at its own build path, and the fallback the address", () => {
		expect(languageHomePath(FALLBACK_LANGUAGE)).toBe(CLEAN_URL)
		expect(languageHomeFile(FALLBACK_LANGUAGE)).toBe("index.html")
		for (const entry of LANGUAGES.filter((other) => other.language !== FALLBACK_LANGUAGE)) {
			expect(languageHomePath(entry.language)).toBe(`/${entry.buildPath}/`)
			expect(languageHomeFile(entry.language)).toBe(`${entry.buildPath}/index.html`)
		}
	})

	it("states the Site's one address for every Language", () => {
		expect(CLEAN_URL).toBe("/")
		expect(ABSOLUTE_CLEAN_URL).toBe(`${SITE_ORIGIN}/`)
	})

	it("gives every Language a Language choice link that returns to the address", () => {
		for (const entry of LANGUAGES) {
			expect(languageChoiceLink(entry.language)).toBe(`/?lang=${entry.language}`)
		}
	})

	it("names only a Language the Site speaks from a code", () => {
		expect(spokenLanguage("th")).toBe("th")
		expect(spokenLanguage(" TH ")).toBe("th")
		expect(spokenLanguage("zz")).toBeUndefined()
		expect(spokenLanguage(null)).toBeUndefined()
		expect(spokenLanguage("")).toBeUndefined()
	})

	it("lists every other Language for the switcher, and not the page's own", () => {
		for (const entry of LANGUAGES) {
			const others = otherLanguages(entry.language).map((other) => other.language)
			const expected = LANGUAGES.map((other) => other.language).filter(
				(code) => code !== entry.language,
			)
			expect(others).toEqual(expected)
		}
	})

	it("rejects a Language the Site does not speak, with a code", () => {
		expect(codeOf(() => languageEntry("xx"))).toBe("LANGUAGE_UNKNOWN")
	})

	it("names each Language in its own Dictionary", () => {
		expect(dictionaryFor("th").languageName).toBe("ไทย")
		expect(dictionaryFor("en").languageName).toBe("English")
	})
})
