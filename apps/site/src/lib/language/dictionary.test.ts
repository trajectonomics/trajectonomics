import { describe, expect, it } from "bun:test"
import { OWNER_WRITTEN_KEYS, OWNER_WRITTEN_PLACEHOLDER } from "./dictionary"
import { LANGUAGES } from "./languages"

describe("the Dictionary of every Language", () => {
	it("has the same keys in every Language, so neither is a lesser page", () => {
		const first = LANGUAGES[0]
		if (first === undefined) throw new Error("the Site speaks no Language")
		const keys = Object.keys(first.dictionary).sort()
		for (const entry of LANGUAGES) {
			expect(Object.keys(entry.dictionary).sort()).toEqual(keys)
		}
	})

	it("leaves every string only the owner may write as the placeholder", () => {
		for (const entry of LANGUAGES) {
			for (const key of OWNER_WRITTEN_KEYS) {
				expect({ language: entry.language, key, value: entry.dictionary[key] }).toEqual({
					language: entry.language,
					key,
					value: OWNER_WRITTEN_PLACEHOLDER,
				})
			}
		}
	})

	it("writes every other string, so an agent invents no money or tax wording", () => {
		const ownerKeys = new Set<string>(OWNER_WRITTEN_KEYS)
		for (const entry of LANGUAGES) {
			for (const [key, value] of Object.entries(entry.dictionary)) {
				if (ownerKeys.has(key)) continue
				expect({ key, placeholder: value.includes(OWNER_WRITTEN_PLACEHOLDER) }).toEqual({
					key,
					placeholder: false,
				})
			}
		}
	})

	it("writes every string, so no page renders an empty label", () => {
		for (const entry of LANGUAGES) {
			for (const [key, value] of Object.entries(entry.dictionary)) {
				expect({ key, written: value.trim().length > 0 }).toEqual({ key, written: true })
			}
		}
	})
})
