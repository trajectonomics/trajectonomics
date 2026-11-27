import type { Dictionary } from "./dictionary"

/** The legal page titles, the footer and the root redirect, in plain Thai. */
export const THAI_LEGAL = {
	footerPrivacy: "ความเป็นส่วนตัว",
	footerTerms: "ข้อกำหนด",
	footerContact: "ติดต่อ",
	footerSource: "ซอร์สโค้ด",
	footerLicence: "AGPL-3.0-only",

	privacyTitle: "ความเป็นส่วนตัว",
	privacyDescription: "สิ่งที่บริการบัญชี Trajectonomics เก็บไว้ เพราะอะไร และจะลบได้อย่างไร",
	termsTitle: "ข้อกำหนด",
	termsDescription: "ข้อกำหนดสั้น ๆ สำหรับบริการบัญชี Trajectonomics",
	legalOfficialNote: "ฉบับภาษาอังกฤษเป็นฉบับทางการ",
	legalUpdated: "อัปเดตล่าสุด",

	redirectDescription: "เข้าสู่ระบบ Trajectonomics หรือไปที่บัญชีของคุณหากเข้าสู่ระบบอยู่แล้ว",
	redirectContinue: "ไปที่บัญชีของคุณ",
} satisfies Partial<Dictionary>
