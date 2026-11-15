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
		expect(thai.heroHeadingCycle).toEqual([
			"วางแผนเกษียณอายุ",
			"คาดการณ์อนาคตทางการเงิน",
			"สร้างอนาคตของคุณ",
		])
	})

	it("keeps the English sub-line and disclaimer the owner approved", () => {
		const english = dictionaryFor("en")
		expect(english.heroSubline).toBe(
			"traj is a free, open-source money tool built for AI agents. Install as a skill in one command, and let your agent handle the rest — no accounts, no dashboards, no subscriptions.",
		)
		expect(english.footerDisclaimer).toBe(
			"traj v0.1.0 is the first stable release; a bug is still possible. Tax is applied only when you ask for it, and every figure says whether it includes tax. Trust the figures traj returns. If you find a bug, open an issue on https://github.com/trajectonomics/cli and we will update it as soon as we can.",
		)
	})

	it("keeps the Thai sub-line and disclaimer the owner approved", () => {
		const thai = dictionaryFor("th")
		expect(thai.heroSubline).toBe(
			"traj คือเครื่องมือวางแผนการเงินโอเพนซอร์สฟรีสำหรับ AI agent ติดตั้งเป็นสกิลได้ในคำสั่งเดียว แล้วให้ agent จัดการส่วนที่เหลือ — ไม่ต้องสร้างบัญชี ไม่มีแดชบอร์ด ไม่ต้องสมัครสมาชิก",
		)
		expect(thai.footerDisclaimer).toBe(
			"traj v0.1.0 เป็นรุ่นเสถียรรุ่นแรก ยังอาจมีบั๊ก ระบบจะคำนวณภาษีเมื่อคุณขอเท่านั้น และทุกตัวเลขบอกว่ารวมภาษีหรือไม่ เชื่อตัวเลขที่ traj ส่งกลับ หากพบบั๊ก ให้เปิด issue ที่ https://github.com/trajectonomics/cli แล้วเราจะอัปเดตโดยเร็ว",
		)
	})

	it("names both parts of the product at stable v0.1.0 in the release line", () => {
		for (const entry of LANGUAGES) {
			expect({ language: entry.language, release: entry.dictionary.heroRelease }).toEqual({
				language: entry.language,
				release: expect.stringContaining("v0.1.0"),
			})
			expect(entry.dictionary.heroRelease).toContain("traj CLI")
			expect(entry.dictionary.heroRelease).toContain("traj-onboarding")
		}
		expect(dictionaryFor("en").heroReleaseDate).toBe("12 Nov 2026")
		expect(dictionaryFor("th").heroReleaseDate).toBe("12 พ.ย. 2026")
	})

	it("keeps the English two-part section, next step and menu labels the owner approved", () => {
		const english = dictionaryFor("en")
		expect(english.twoPartHeading).toBe("Two parts, one command")
		expect(english.skillsCardTitle).toBe("Skills")
		expect(english.cliCardTitle).toBe("traj CLI")
		expect(english.starMenuLabel).toBe("Star")
		expect(english.starOnboarding).toBe("Star traj-onboarding")
		expect(english.cliDocsLink).toBe("Read the CLI docs")
		expect(english.twoPartFootnote).toBe(
			"One command installs traj-onboarding; it sets up the CLI and the traj skill.",
		)
		expect(english.nextStep).toBe(
			"Now open your coding agent and paste it. traj-onboarding asks about your money and gets you started.",
		)
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
