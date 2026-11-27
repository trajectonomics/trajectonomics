import { CONSENT_WORDING_VERSION } from "../core/marketing-consent-rules"
import type { Language } from "./language"

/**
 * The sentence a person agreed to, by `wordingVersion`. The account page shows the sentence the
 * stored version names, never today's wording, so a person can see exactly what they agreed to. A
 * wording change is a new version and a new row; the old sentence stays here.
 */
export const CONSENT_WORDINGS: Readonly<Record<string, Readonly<Record<Language, string>>>> =
	Object.freeze({
		"2026-11-27": Object.freeze({
			en: "Email me product updates (about once a month). You can stop any time.",
			th: "ส่งข่าวผลิตภัณฑ์ให้ฉันทางอีเมล (ประมาณเดือนละครั้ง) ยกเลิกได้ทุกเมื่อ",
		}),
	})

/** The sentence one stored wording version stands for, in the reading language. */
export function consentWording(language: Language, wordingVersion: string): string {
	const wording = CONSENT_WORDINGS[wordingVersion] ?? CONSENT_WORDINGS[CONSENT_WORDING_VERSION]
	if (wording === undefined) throw new Error(`no consent wording for ${wordingVersion}`)
	return wording[language]
}

/** The sentence the first-sign-in question shows, which is the version a new answer records. */
export function currentConsentWording(language: Language): string {
	return consentWording(language, CONSENT_WORDING_VERSION)
}
