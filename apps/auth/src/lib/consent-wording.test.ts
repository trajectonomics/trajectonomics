import { describe, expect, it } from "bun:test"
import { CONSENT_WORDING_VERSION } from "../core/consent"
import { CONSENT_WORDINGS, consentWording, currentConsentWording } from "./consent-wording"
import { LANGUAGES } from "./language"

describe("the consent wording", () => {
	it("writes every version in both languages", () => {
		for (const [version, wording] of Object.entries(CONSENT_WORDINGS)) {
			for (const language of LANGUAGES) {
				expect({ version, language, written: wording[language].trim().length > 0 }).toEqual({
					version,
					language,
					written: true,
				})
			}
		}
	})

	it("keeps the first-sign-in sentence exact, in both languages", () => {
		expect(consentWording("en", CONSENT_WORDING_VERSION)).toBe(
			"Email me product updates (about once a month). You can stop any time.",
		)
		expect(consentWording("th", CONSENT_WORDING_VERSION)).toContain("เดือนละครั้ง")
	})

	it("is the current version's sentence when a page shows the question", () => {
		expect(currentConsentWording("en")).toBe(consentWording("en", CONSENT_WORDING_VERSION))
		expect(currentConsentWording("th")).toBe(consentWording("th", CONSENT_WORDING_VERSION))
	})

	it("falls back to the current sentence for a version it does not know", () => {
		expect(consentWording("en", "1999-01-01")).toBe(currentConsentWording("en"))
	})
})
