import { describe, expect, it } from "bun:test"
import type { Dictionary } from "./dictionary"
import { currentLanguageName, OWNER_WRITTEN_PLACEHOLDER } from "./dictionary"
import { dictionaryFor, LANGUAGES } from "./languages"

/** The keys of one Dictionary, as the owner-written rule reads them. */
function keysOf(dictionary: Dictionary): (keyof Dictionary)[] {
	return Object.keys(dictionary) as (keyof Dictionary)[]
}

/** Every string one key carries, so a key that is a list of strings is read like its neighbours. */
function textsOf(value: Dictionary[keyof Dictionary]): readonly string[] {
	return typeof value === "string" ? [value] : value
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
				const placeholder = textsOf(entry.dictionary[key]).some((text) =>
					text.includes(OWNER_WRITTEN_PLACEHOLDER),
				)
				expect({ key, placeholder }).toEqual({ key, placeholder: owner })
			}
		}
	})

	it("writes every string, so no page renders an empty label", () => {
		for (const entry of LANGUAGES) {
			for (const key of keysOf(entry.dictionary)) {
				const texts = textsOf(entry.dictionary[key])
				expect({ key, written: texts.every((text) => text.trim().length > 0) }).toEqual({
					key,
					written: true,
				})
				expect({ key, texts: texts.length > 0 }).toEqual({ key, texts: true })
			}
		}
	})

	it("sets the English hero headline the owner asked for, with its accent", () => {
		const english = dictionaryFor("en")
		expect(english.heroHeadingPrefix).toBe("Deterministic layers for")
		expect(english.heroHeadingAccent).toBe("Financial Planning")
	})

	it("sets the Thai hero headline, with its accent", () => {
		const thai = dictionaryFor("th")
		expect(thai.heroHeadingPrefix).toBe("ชุดเครื่องมือสำหรับ")
		expect(thai.heroHeadingAccent).toBe("การวางแผนการเงิน")
	})

	it("keeps the release pill's licence and the repository link label the owner approved", () => {
		const english = dictionaryFor("en")
		expect(english.heroLicence).toBe("AGPL-3.0 · open source")
		expect(english.repoLinkLabel).toBe("GitHub stars")
		expect(english.copied).toBe("Prompt copied")
	})

	it("writes the two guesses and the six features in every Language", () => {
		for (const { language, dictionary } of LANGUAGES) {
			expect({ language, guesses: dictionary.actionGuesses.length }).toEqual({
				language,
				guesses: 2,
			})
			expect({ language, titles: dictionary.featureTitles.length }).toEqual({ language, titles: 6 })
			expect({ language, copies: dictionary.featureCopies.length }).toEqual({ language, copies: 6 })
		}
	})

	it("gives the agent alone two different guesses, because that is the point of the comparison", () => {
		for (const { language, dictionary } of LANGUAGES) {
			expect({ language, unique: new Set(dictionary.actionGuesses).size }).toEqual({
				language,
				unique: dictionary.actionGuesses.length,
			})
		}
	})

	it("retires the How it works section's strings, because the page has no such section", () => {
		for (const { language, dictionary } of LANGUAGES) {
			const survivors = Object.keys(dictionary).filter((key) => /^how[A-Z]/.test(key))
			expect({ language, survivors }).toEqual({ language, survivors: [] })
			expect({ language, onboarding: "starOnboarding" in dictionary }).toEqual({
				language,
				onboarding: false,
			})
		}
	})

	it("names the Answer engine file's one section, and keeps the retired window's controls out", () => {
		const english = dictionaryFor("en")
		expect(english.actionHeading).toBe("See it in action")
		for (const { language, dictionary } of LANGUAGES) {
			for (const key of [
				"actionWithoutNote",
				"actionWithNote",
				"replay",
				"appNewChat",
				"appRecents",
				"appTitleWithout",
				"appTitleWith",
				"appPlaceholder",
				"demoLink",
			] as const) {
				expect({ language, key, present: key in dictionary }).toEqual({
					language,
					key,
					present: false,
				})
			}
		}
	})

	it("names the CTA's Copy control for the visitor's agent, in both Languages", () => {
		expect(dictionaryFor("en").copy).toBe("Copy prompt to your AI agents")
		expect(dictionaryFor("th").copy).toBe("คัดลอกพรอมต์ให้เอเจนต์ของคุณ")
	})

	it("writes the prompt's two messages and the button's short confirmation, in both Languages", () => {
		expect(dictionaryFor("en").copied).toBe("Prompt copied")
		expect(dictionaryFor("en").copyFailed).toBe("Select the prompt and copy it.")
		expect(dictionaryFor("en").copiedLabel).toBe("Copied")
		expect(dictionaryFor("th").copied).toBe("คัดลอกพรอมต์แล้ว")
		expect(dictionaryFor("th").copyFailed).toBe("เลือกพรอมต์แล้วคัดลอก")
		expect(dictionaryFor("th").copiedLabel).toBe("คัดลอกแล้ว")
	})

	it("retires the three step labels, because the window has no steps any more", () => {
		for (const { language, dictionary } of LANGUAGES) {
			expect({ language, steps: "stepLabels" in dictionary }).toEqual({ language, steps: false })
		}
	})

	it("writes the owner's way out under the prompt, in both Languages", () => {
		expect(dictionaryFor("en").cliInstallLink).toBe("Install the CLI directly")
		expect(dictionaryFor("th").cliInstallLink).toBe("ติดตั้ง CLI โดยตรง")
	})

	it("keeps the document title and the description the owner approved, in every Language", () => {
		expect(dictionaryFor("en").documentTitle).toBe(
			"Trajectonomics — traj: financial simulation for AI agents",
		)
		expect(dictionaryFor("en").description).toBe(
			"Trajectonomics makes traj, a free, open-source financial simulation tool for AI agents: a CLI and a skill that plan retirement with no account.",
		)
		expect(dictionaryFor("th").documentTitle).toBe(
			"Trajectonomics — traj เครื่องมือจำลองการเงินสำหรับ AI agent",
		)
		expect(dictionaryFor("th").description).toBe(
			"Trajectonomics สร้าง traj เครื่องมือจำลองการเงินโอเพนซอร์สฟรีสำหรับ AI agent — CLI และสกิลที่ทำงานบนเครื่องคุณ ไม่ต้องสร้างบัญชี ไม่มีแดชบอร์ด",
		)
	})

	it("keeps the title and the description short enough for a search result", () => {
		for (const entry of LANGUAGES) {
			const { documentTitle, description } = entry.dictionary
			expect({ language: entry.language, title: documentTitle.length <= 60 }).toEqual({
				language: entry.language,
				title: true,
			})
			expect({ language: entry.language, description: description.length <= 155 }).toEqual({
				language: entry.language,
				description: true,
			})
		}
	})

	it("names Trajectonomics first in the document title and the description of every Language", () => {
		for (const entry of LANGUAGES) {
			const { documentTitle, description } = entry.dictionary
			expect({
				language: entry.language,
				title: documentTitle.startsWith("Trajectonomics — "),
			}).toEqual({ language: entry.language, title: true })
			expect({
				language: entry.language,
				description: description.startsWith("Trajectonomics "),
			}).toEqual({ language: entry.language, description: true })
		}
	})

	it("names each Language in its own words, and the short label of the reading one", () => {
		expect(dictionaryFor("en").languageName).toBe("English")
		expect(dictionaryFor("th").languageName).toBe("ไทย")
		expect(dictionaryFor("en").languageSwitchLabel).toBe("EN")
		expect(dictionaryFor("th").languageSwitchLabel).toBe("ไทย")
	})
})

describe("the hero headline", () => {
	it("holds still: a plain run and one accent, with nothing for a script to cycle", () => {
		for (const entry of LANGUAGES) {
			const keys = Object.keys(entry.dictionary)
			expect({ language: entry.language, cycles: keys.includes("heroHeadingCycle") }).toEqual({
				language: entry.language,
				cycles: false,
			})
			expect(entry.dictionary.heroHeadingAccent).not.toBe(entry.dictionary.heroHeadingPrefix)
		}
	})
})

describe("the accessible name of the current Language link", () => {
	it("is the Language's own name when the visible label already is it", () => {
		expect(currentLanguageName(dictionaryFor("th"))).toBe("ไทย")
	})

	it("keeps the visible short label in front of the full name", () => {
		expect(currentLanguageName(dictionaryFor("en"))).toBe("EN — English")
	})
})
