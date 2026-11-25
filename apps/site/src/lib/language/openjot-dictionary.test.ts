import { describe, expect, it } from "bun:test"
import { OPENJOT_SIGNING_FINGERPRINT } from "../site/openjot"
import { OPENJOT_LANGUAGES, openJotBuildFile, openJotDictionaryFor } from "./openjot-dictionary"

/** Every string one key carries, so a list is read like its neighbours. */
function textsOf(value: unknown): readonly string[] {
	return Array.isArray(value) ? value : [String(value)]
}

describe("the OpenJot page's Dictionary", () => {
	it("has the same keys in every Language, so neither is a lesser page", () => {
		const [first, ...rest] = OPENJOT_LANGUAGES.map((entry) => Object.keys(entry.dictionary).sort())
		for (const keys of rest) expect(keys).toEqual(first ?? [])
	})

	it("writes every string, so no page renders an empty label", () => {
		for (const entry of OPENJOT_LANGUAGES) {
			for (const [key, value] of Object.entries(entry.dictionary)) {
				expect({ language: entry.language, key, texts: textsOf(value).length > 0 }).toEqual({
					language: entry.language,
					key,
					texts: true,
				})
				for (const text of textsOf(value)) {
					expect({ language: entry.language, key, written: text.trim().length > 0 }).toEqual({
						language: entry.language,
						key,
						written: true,
					})
				}
			}
		}
	})

	it("keeps the six features, the three steps and the four screenshots paired", () => {
		for (const { language, dictionary } of OPENJOT_LANGUAGES) {
			expect({ language, titles: dictionary.featureTitles.length }).toEqual({ language, titles: 6 })
			expect({ language, copies: dictionary.featureCopies.length }).toEqual({ language, copies: 6 })
			expect({ language, steps: dictionary.stepTitles.length }).toEqual({ language, steps: 3 })
			expect({ language, stepCopies: dictionary.stepCopies.length }).toEqual({
				language,
				stepCopies: 3,
			})
			expect({ language, captions: dictionary.screenCaptions.length }).toEqual({
				language,
				captions: 4,
			})
			expect({ language, alts: dictionary.screenAlts.length }).toEqual({ language, alts: 4 })
			expect({ language, questions: dictionary.faqQuestions.length }).toEqual({
				language,
				questions: 6,
			})
			expect({ language, answers: dictionary.faqAnswers.length }).toEqual({
				language,
				answers: 6,
			})
		}
	})

	it("keeps the title and the description short enough for a search result", () => {
		for (const { language, dictionary } of OPENJOT_LANGUAGES) {
			expect({ language, title: dictionary.documentTitle.length <= 60 }).toEqual({
				language,
				title: true,
			})
			expect({ language, description: dictionary.description.length <= 155 }).toEqual({
				language,
				description: true,
			})
		}
	})

	it("states no markup in any FAQ text, because the page would show the tags as text", () => {
		for (const { dictionary } of OPENJOT_LANGUAGES) {
			for (const text of [...dictionary.faqQuestions, ...dictionary.faqAnswers]) {
				expect(text).not.toMatch(/[<>]/)
			}
		}
	})

	it("keeps the signing certificate's fingerprint verbatim in every Language", () => {
		for (const { dictionary } of OPENJOT_LANGUAGES) {
			expect(dictionary.faqAnswers[1]).toContain(OPENJOT_SIGNING_FINGERPRINT)
		}
	})

	it("writes the fallback Language at openjot/, and Thai at th/openjot/", () => {
		expect(openJotBuildFile("en")).toBe("openjot/index.html")
		expect(openJotBuildFile("th")).toBe("th/openjot/index.html")
		expect(openJotDictionaryFor("th").heroHeadingAccent).not.toBe(
			openJotDictionaryFor("en").heroHeadingAccent,
		)
	})
})
