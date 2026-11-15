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

	it("keeps the English hero headline the owner approved, and the suffixes it cycles", () => {
		const english = dictionaryFor("en")
		expect(english.heroHeadingPrefix).toBe("The only tool your agent needs to")
		expect(english.heroHeadingCycle).toEqual([
			"plan your retirement.",
			"project your finances.",
			"build your future.",
		])
	})

	it("keeps the Thai hero headline the owner approved, and the suffixes it cycles", () => {
		const thai = dictionaryFor("th")
		expect(thai.heroHeadingPrefix).toBe("เครื่องมือเดียวที่ agent ของคุณต้องมี เพื่อ")
		expect(thai.heroHeadingCycle).toEqual(["วางแผนเกษียณอายุ", "จำลองการเงิน", "สร้างอนาคตของคุณ"])
	})

	it("keeps the English sub-line and disclaimer the owner approved", () => {
		const english = dictionaryFor("en")
		expect(english.heroSubline).toBe(
			"traj is a free, open-source financial simulation tool built for AI agents. Ship as a skill and CLI — local-first, no accounts, no dashboards, no subscriptions.",
		)
		expect(english.footerDisclaimer).toBe(
			"traj v0.1.0 is the first stable release; a bug is still possible. Tax is applied only when you ask for it, and every figure says whether it includes tax. Trust the figures traj returns. If you find a bug, open an issue on https://github.com/trajectonomics/cli and we will update it as soon as we can.",
		)
	})

	it("keeps the Thai sub-line and disclaimer the owner approved", () => {
		const thai = dictionaryFor("th")
		expect(thai.heroSubline).toBe(
			"traj คือเครื่องมือจำลองการเงินโอเพนซอร์สฟรีสำหรับ AI agent ใช้ได้ทั้งเป็นสกิลและ CLI — ทำงานบนเครื่องคุณ ไม่ต้องสร้างบัญชี ไม่มีแดชบอร์ด ไม่ต้องสมัครสมาชิก",
		)
		expect(thai.footerDisclaimer).toBe(
			"traj v0.1.0 เป็นรุ่นเสถียรรุ่นแรก ยังอาจมีบั๊ก ระบบจะคำนวณภาษีเมื่อคุณขอเท่านั้น และทุกตัวเลขบอกว่ารวมภาษีหรือไม่ เชื่อตัวเลขที่ traj ส่งกลับ หากพบบั๊ก ให้เปิด issue ที่ https://github.com/trajectonomics/cli แล้วเราจะอัปเดตโดยเร็ว",
		)
	})

	it("names both parts of the product at stable v0.1.0 in the footer's release line", () => {
		for (const entry of LANGUAGES) {
			expect({ language: entry.language, release: entry.dictionary.releaseLine }).toEqual({
				language: entry.language,
				release: expect.stringContaining("v0.1.0"),
			})
			expect(entry.dictionary.releaseLine).toContain("traj CLI")
			expect(entry.dictionary.releaseLine).toContain("traj-onboarding")
		}
		expect(dictionaryFor("en").releaseDate).toBe("12 Nov 2026")
		expect(dictionaryFor("th").releaseDate).toBe("12 พ.ย. 2026")
	})

	it("keeps the release pill, the two-tile section and the menu labels the owner approved", () => {
		const english = dictionaryFor("en")
		expect(english.heroVersion).toBe("v0.1.0")
		expect(english.heroLicence).toBe("MIT · open source")
		expect(english.twoPartHeading).toBe("Two parts, one command")
		expect(english.agentCardTitle).toBe("AI agent")
		expect(english.agentCardCopy).toBe("Your agent does the talking.")
		expect(english.cliCardTitle).toBe("traj CLI")
		expect(english.cliCardCopy).toBe("Same input, the same answer.")
		expect(english.diagramConnector).toBe("traj calc")
		expect(english.starMenuLabel).toBe("GitHub stars")
		expect(english.starMenuGroupLabel).toBe("Repositories")
		expect(english.starMenuAllRepos).toBe("All repositories")
		expect(english.starOnboarding).toBe("Star traj-onboarding")
		expect(english.cliDocsLink).toBe("Read the CLI docs")
		expect(english.copied).toBe("Command copied")
	})

	it("keeps each diagram tile's copy to five words", () => {
		const english = dictionaryFor("en")
		for (const copy of [english.agentCardCopy, english.cliCardCopy]) {
			expect(copy.replace(/[.,]/g, "").split(/\s+/)).toHaveLength(5)
		}
	})

	it("writes the three steps under the command, in every Language", () => {
		for (const entry of LANGUAGES) {
			expect({ language: entry.language, steps: entry.dictionary.stepLabels.length }).toEqual({
				language: entry.language,
				steps: 3,
			})
		}
		expect(dictionaryFor("en").stepLabels).toEqual([
			"1 Install the onboarding skill",
			"2 Open your coding agent",
			"3 Run the onboarding skill",
		])
	})

	it("names each Language in its own words, and the short label of the reading one", () => {
		expect(dictionaryFor("en").languageName).toBe("English")
		expect(dictionaryFor("th").languageName).toBe("ไทย")
		expect(dictionaryFor("en").languageSwitchLabel).toBe("EN")
		expect(dictionaryFor("th").languageSwitchLabel).toBe("ไทย")
	})
})

describe("the hero headline a script cycles", () => {
	it("holds a phrase no earlier one repeats, so the cycle ends on a new line", () => {
		for (const entry of LANGUAGES) {
			const phrases = [entry.dictionary.heroHeadingPrefix, ...entry.dictionary.heroHeadingCycle]
			expect({ language: entry.language, cycles: phrases.length > 1 }).toEqual({
				language: entry.language,
				cycles: true,
			})
			expect({ language: entry.language, unique: new Set(phrases).size }).toEqual({
				language: entry.language,
				unique: phrases.length,
			})
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
