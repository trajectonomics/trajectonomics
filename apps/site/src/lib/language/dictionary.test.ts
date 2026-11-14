import { describe, expect, it } from "bun:test"
import type { Dictionary } from "./dictionary"
import { OWNER_WRITTEN_PLACEHOLDER } from "./dictionary"
import { dictionaryFor, LANGUAGES } from "./languages"

/** The keys of one Dictionary, as the owner-written rule reads them. */
function keysOf(dictionary: Dictionary): (keyof Dictionary)[] {
	return Object.keys(dictionary) as (keyof Dictionary)[]
}

describe("the Dictionary of every Language", () => {
	it("has the same keys in every Language, so neither is a lesser page", () => {
		const first = LANGUAGES[0]
		if (first === undefined) throw new Error("the Site speaks no Language")
		const keys = keysOf(first.dictionary).sort()
		for (const entry of LANGUAGES) {
			expect(keysOf(entry.dictionary).sort()).toEqual(keys)
		}
	})

	it("leaves the keys only the owner may write as the placeholder, and no other", () => {
		for (const entry of LANGUAGES) {
			for (const key of keysOf(entry.dictionary)) {
				const owner = entry.ownerWritten.includes(key)
				expect({
					key,
					placeholder: entry.dictionary[key].includes(OWNER_WRITTEN_PLACEHOLDER),
				}).toEqual({
					key,
					placeholder: owner,
				})
			}
		}
	})

	it("writes every string, so no page renders an empty label", () => {
		for (const entry of LANGUAGES) {
			for (const key of keysOf(entry.dictionary)) {
				expect({ key, written: entry.dictionary[key].trim().length > 0 }).toEqual({
					key,
					written: true,
				})
			}
		}
	})

	it("keeps the English hero text the owner confirmed", () => {
		const english = dictionaryFor("en")
		expect(english.heroHeading).toBe("A money tool your AI agent operates.")
		expect(english.heroSubline).toBe(
			"Tell your agent what you earn, spend and owe. traj keeps the books and returns exact, repeatable numbers. Free and open source. Thailand first.",
		)
	})

	it("names each Language in its own words, and the short label of the reading one", () => {
		expect(dictionaryFor("en").languageName).toBe("English")
		expect(dictionaryFor("th").languageName).toBe("ไทย")
		expect(dictionaryFor("en").languageSwitchLabel).toBe("EN")
		expect(dictionaryFor("th").languageSwitchLabel).toBe("ไทย")
	})
})
