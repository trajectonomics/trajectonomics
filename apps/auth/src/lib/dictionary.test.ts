import { describe, expect, it } from "bun:test"
import type { Dictionary } from "./dictionary"
import { dictionaryFor, LANGUAGES } from "./language"

/** The keys of one dictionary, as the parity rule reads them. */
function keysOf(dictionary: Dictionary): (keyof Dictionary)[] {
	return (Object.keys(dictionary) as (keyof Dictionary)[]).sort()
}

/** Every string one key carries, so a key that is a function is read by calling it. */
function textsOf(value: Dictionary[keyof Dictionary]): readonly string[] {
	if (typeof value === "function") return [value("Example")]
	return [value]
}

describe("the dictionary of every language", () => {
	it("has the same keys in English and Thai", () => {
		const keys = keysOf(dictionaryFor("en"))
		for (const language of LANGUAGES) expect(keysOf(dictionaryFor(language))).toEqual(keys)
	})

	it("writes every string, so no page renders an empty label", () => {
		for (const language of LANGUAGES) {
			for (const key of keysOf(dictionaryFor(language))) {
				const texts = textsOf(dictionaryFor(language)[key])
				expect({ language, key, written: texts.every((text) => text.trim().length > 0) }).toEqual({
					language,
					key,
					written: true,
				})
			}
		}
	})

	it("names the app in the consent heading, in both languages", () => {
		for (const language of LANGUAGES) {
			expect(dictionaryFor(language).consentHeading("traj")).toContain("traj")
		}
	})

	it("describes data:ingest in the plain words the design asks for", () => {
		expect(dictionaryFor("en").scopeDataIngest).toBe("Send your AI usage numbers to the data site")
		expect(dictionaryFor("th").scopeDataIngest).not.toBe(dictionaryFor("en").scopeDataIngest)
	})

	it("keeps the first-sign-in sentence exact, in both languages", () => {
		expect(dictionaryFor("en").welcomeCheckbox).toBe(
			"Email me product updates (about once a month). You can stop any time.",
		)
		expect(dictionaryFor("th").welcomeCheckbox).toContain("เดือนละครั้ง")
	})

	it("gives every page a title and a description", () => {
		const english = dictionaryFor("en")
		const pages: readonly (readonly [string, string])[] = [
			[english.signInTitle, english.signInDescription],
			[english.welcomeTitle, english.welcomeDescription],
			[english.deviceTitle, english.deviceDescription],
			[english.accountTitle, english.accountDescription],
			[english.privacyTitle, english.privacyDescription],
			[english.termsTitle, english.termsDescription],
			[english.redirectContinue, english.redirectDescription],
		]
		for (const [title, description] of pages) {
			expect(title.trim().length).toBeGreaterThan(0)
			expect(description.trim().length).toBeGreaterThan(0)
		}
	})

	it("says the English legal text is the official one, on the Thai page", () => {
		expect(dictionaryFor("th").legalOfficialNote).toContain("ภาษาอังกฤษ")
		expect(dictionaryFor("en").legalOfficialNote).toContain("official")
	})
})
