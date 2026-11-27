import { describe, expect, test } from "bun:test"
import { dictionaryFor } from "./dictionary"
import { LANGUAGES } from "./languages"

describe("the Dictionaries", () => {
	test("every Interface Language writes every word, and none is blank", () => {
		for (const language of LANGUAGES) {
			for (const [key, value] of Object.entries(dictionaryFor(language))) {
				const text = typeof value === "function" ? String(value("X", "Y")) : JSON.stringify(value)
				expect({ language, key, written: text.trim().length > 0 }).toEqual({
					language,
					key,
					written: true,
				})
			}
		}
	})

	test("every Dictionary names every Language", () => {
		for (const language of LANGUAGES) {
			expect(Object.keys(dictionaryFor(language).languageNames).toSorted()).toEqual(
				[...LANGUAGES].toSorted(),
			)
		}
	})

	test("Thai is never the English word", () => {
		expect(dictionaryFor("th").frontHeading).not.toBe(dictionaryFor("en").frontHeading)
		expect(dictionaryFor("th").byline).not.toBe(dictionaryFor("en").byline)
	})

	test("the fallback notice names both Languages", () => {
		const en = dictionaryFor("en")
		expect(en.fallbackNotice(en.languageNames.en, en.languageNames.th)).toBe(
			"This post is not written in English yet, so you are reading it in Thai.",
		)
		const th = dictionaryFor("th")
		expect(th.fallbackNotice(th.languageNames.th, th.languageNames.en)).toBe(
			"บทความนี้ยังไม่มีฉบับภาษาไทย จึงแสดงฉบับภาษาอังกฤษแทน",
		)
	})
})
