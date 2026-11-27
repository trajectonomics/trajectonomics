import { describe, expect, test } from "bun:test"
import { dictionaryFor } from "./dictionary"
import { FILTER_GROUPS } from "./filters"
import { LANGUAGES } from "./languages"
import { POST_TYPES } from "./posts"

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

	test("every Dictionary names every Language, Post Type and filter group", () => {
		for (const language of LANGUAGES) {
			const words = dictionaryFor(language)
			expect(Object.keys(words.languageNames).toSorted()).toEqual([...LANGUAGES].toSorted())
			expect(Object.keys(words.typeLabels).toSorted()).toEqual([...POST_TYPES].toSorted())
			expect(Object.keys(words.filterGroups).toSorted()).toEqual([...FILTER_GROUPS].toSorted())
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
