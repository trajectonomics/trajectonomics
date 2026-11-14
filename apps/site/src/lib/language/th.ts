import type { LanguageEntry } from "./language"

/** Thai: the Language of `/th/`, and of Thailand when no tag chooses. */
export const THAI: LanguageEntry = Object.freeze({
	language: "th",
	pathPrefix: "/th",
	countries: Object.freeze(["TH"]),
	dictionary: Object.freeze({
		languageName: "ไทย",
		languageSwitchLabel: "ไทย",
		heroHeadingPrefix: "เครื่องมือเดียวที่ agent ของคุณต้องการสำหรับ",
		heroHeadingCycle: Object.freeze([
			"การวางแผนเกษียณอายุ",
			"การคาดการณ์การเงิน",
			"อนาคตของคุณ",
		] as const),
		heroEyebrow: "v0.1.0-alpha.1 กำลังเปิดตัวแล้ว — 2026-11-14",
		heroSubline:
			"traj คือเครื่องมือการเงินโอเพนซอร์สฟรีสำหรับ AI agent คำสั่งเดียวติดตั้งเป็นสกิล แล้ว agent ของคุณจะจัดการส่วนที่เหลือ — ไม่ต้องมีบัญชี ไม่ต้องมีแดชบอร์ด ไม่ต้องสมัครสมาชิก",
		docsLink: "เอกสาร",
		githubLink: "GitHub",
		starOnGitHub: "ให้ดาวบน GitHub",
		copy: "คัดลอก",
		copied: "คัดลอกแล้ว",
		copyFailed: "เลือกคำสั่งแล้วคัดลอก",
		licence: "MIT",
		org: "trajectonomics",
		footerDisclaimer:
			"traj ยังเป็นอัลฟา จึงอาจมีบั๊ก ยังไม่คำนวณภาษี เชื่อตัวเลขที่ traj ส่งกลับ หากพบบั๊ก ให้เปิด issue ที่ https://github.com/trajectonomics/skills แล้วเราจะอัปเดตโดยเร็ว",
		notFoundHeading: "ไม่พบหน้านี้",
		notFoundBody: "ลิงก์นี้อาจถูกย้ายหรือพิมพ์ผิด",
	}),
	ownerWritten: Object.freeze([] as const),
})
