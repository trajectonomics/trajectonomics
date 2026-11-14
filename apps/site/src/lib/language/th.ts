import type { Dictionary } from "./dictionary"
import { OWNER_WRITTEN_PLACEHOLDER } from "./dictionary"
import type { LanguageEntry } from "./language"

/** Thai: the Language of `/th/`, and of Thailand when no tag chooses. */
export const THAI: LanguageEntry = Object.freeze({
	language: "th",
	pathPrefix: "/th",
	countries: Object.freeze(["TH"]),
	dictionary: Object.freeze({
		languageName: "ไทย",
		languageSwitchLabel: "ไทย",
		heroHeading: OWNER_WRITTEN_PLACEHOLDER,
		heroSubline: OWNER_WRITTEN_PLACEHOLDER,
		docsLink: "เอกสาร",
		githubLink: "GitHub",
		starOnGitHub: "ให้ดาวบน GitHub",
		copy: "คัดลอก",
		copied: "คัดลอกแล้ว",
		copyFailed: "เลือกคำสั่งแล้วคัดลอก",
		licence: "MIT",
		org: "trajectonomics",
		footerDisclaimer: OWNER_WRITTEN_PLACEHOLDER,
		taxSentence: OWNER_WRITTEN_PLACEHOLDER,
		notFoundHeading: "ไม่พบหน้านี้",
		notFoundBody: "ลิงก์นี้อาจถูกย้ายหรือพิมพ์ผิด",
	}),
	ownerWritten: Object.freeze([
		"heroHeading",
		"heroSubline",
		"footerDisclaimer",
		"taxSentence",
	] as const satisfies readonly (keyof Dictionary)[]),
})
