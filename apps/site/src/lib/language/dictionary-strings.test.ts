import { describe, expect, it } from "bun:test"
import { releaseFor } from "../site/release-snapshot"
import { dictionaryFor, LANGUAGES } from "./languages"

/** The release strings the committed Release snapshot derives, in the Language the repositories write. */
const RELEASE = releaseFor("en")

describe("the strings the Dictionary states for its reader", () => {
	it("keeps the English sub-line and disclaimer the owner approved", () => {
		const english = dictionaryFor("en")
		expect(english.heroSubline).toBe(
			"traj is a free, open-source financial simulation tool built for AI agents. Ship as a skill and CLI — local-first, no accounts, no dashboards, no subscriptions.",
		)
		// The owner settled the disclaimer on 2026-11-18: it opens at the bug clause, with no version and no stability claim.
		expect(english.footerDisclaimer).toBe(
			"A bug is still possible. Tax is applied only when you ask for it, and every figure says whether it includes tax. Trust the figures traj returns. If you find a bug, open an issue on https://github.com/trajectonomics/cli and we will update it as soon as we can.",
		)
	})

	it("keeps the Thai sub-line and disclaimer the owner approved", () => {
		const thai = dictionaryFor("th")
		expect(thai.heroSubline).toBe(
			"traj คือเครื่องมือจำลองการเงินโอเพนซอร์สฟรีสำหรับ AI agent ใช้ได้ทั้งเป็นสกิลและ CLI — ทำงานบนเครื่องคุณ ไม่ต้องสร้างบัญชี ไม่มีแดชบอร์ด ไม่ต้องสมัครสมาชิก",
		)
		expect(thai.footerDisclaimer).toBe(
			"ยังอาจมีบั๊ก ระบบจะคำนวณภาษีเมื่อคุณขอเท่านั้น และทุกตัวเลขบอกว่ารวมภาษีหรือไม่ เชื่อตัวเลขที่ traj ส่งกลับ หากพบบั๊ก ให้เปิด issue ที่ https://github.com/trajectonomics/cli แล้วเราจะอัปเดตโดยเร็ว",
		)
	})

	it("states the three plain facts in the footer, in every Language", () => {
		for (const { language, dictionary } of LANGUAGES) {
			expect({ language, labels: dictionary.factLabels.length }).toEqual({ language, labels: 3 })
			expect({ language, texts: dictionary.factTexts.length }).toEqual({ language, texts: 3 })
		}
		const english = dictionaryFor("en")
		expect(english.factTexts[0]).toContain("baht")
		expect(english.factTexts[1]).toContain("100 MB")
		expect(english.factTexts[2]).toContain("run commands")
	})

	it("names the release the Release snapshot records, in every Language", () => {
		for (const entry of LANGUAGES) {
			expect({ language: entry.language, version: entry.dictionary.heroVersion }).toEqual({
				language: entry.language,
				version: RELEASE.heroVersion,
			})
			expect({ language: entry.language, line: entry.dictionary.releaseLine }).toEqual({
				language: entry.language,
				line: RELEASE.releaseLine,
			})
		}
	})

	it("makes no claim about a result that the CLI's output does not carry", () => {
		for (const { language, dictionary } of LANGUAGES) {
			const assumptions = dictionary.featureCopies.some((text) => /assum|สมมติฐาน/.test(text))
			expect({ language, assumptions }).toEqual({ language, assumptions: false })
		}
		expect(dictionaryFor("en").featureCopies[5]).toBe(
			"Every projection, comparison and FI result states its as-of date, engine version and scenario in its JSON.",
		)
		expect(dictionaryFor("th").featureCopies[5]).toBe(
			"ผลลัพธ์ของการคาดการณ์ การเปรียบเทียบ และวัน FI ระบุวันที่ตั้งต้น เวอร์ชันเอนจิน และข้อมูลตั้งต้นไว้ใน JSON",
		)
	})
})
