import { OWNER_WRITTEN_PLACEHOLDER } from "./dictionary"
import type { LanguageEntry } from "./language"

/** Thai: the Language of `/th/`, and of Thailand when no tag chooses. */
export const THAI: LanguageEntry = Object.freeze({
	language: "th",
	pathPrefix: "/th",
	countries: Object.freeze(["TH"]),
	dictionary: Object.freeze({
		languageName: "ไทย",
		heroHeading: OWNER_WRITTEN_PLACEHOLDER,
		heroSubline: OWNER_WRITTEN_PLACEHOLDER,
		installHeading: "ติดตั้ง",
		docsLink: "เอกสาร",
		githubLink: "GitHub",
		starOnGitHub: "ติดดาวบน GitHub",
		copy: "คัดลอก",
		copied: "คัดลอกแล้ว",
		footerDisclaimer: OWNER_WRITTEN_PLACEHOLDER,
		taxSentence: OWNER_WRITTEN_PLACEHOLDER,
		notFoundHeading: "ไม่พบหน้านี้",
		notFoundBody: "ลิงก์นี้อาจถูกย้ายหรือพิมพ์ผิด",
	}),
})
