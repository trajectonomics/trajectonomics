import type { LanguageEntry } from "./language"

/** Thai: the Language of `/th/`, and of Thailand when no tag chooses. */
export const THAI: LanguageEntry = Object.freeze({
	language: "th",
	pathPrefix: "/th",
	countries: Object.freeze(["TH"]),
	dictionary: Object.freeze({
		languageName: "ไทย",
		languageSwitchLabel: "ไทย",
		heroHeading: "เครื่องมือเดียวที่ agent ของคุณต้องการสำหรับอนาคตของคุณ",
		heroHeadingCycle: Object.freeze([
			"เครื่องมือเดียวที่ agent ของคุณต้องการสำหรับ การวางแผนเกษียณ",
			"เครื่องมือเดียวที่ agent ของคุณต้องการสำหรับ ดู trend ของทรัพย์สิน",
		] as const),
		heroSubline:
			"บอก agent เกี่ยวกับสถานะการเงินและเป้าหมายของคุณ agent ใช้ traj ทำงานบัญชี การคาดการณ์ทางการเงิน และการเปรียบเทียบเส้นทางชีวิต แล้วอธิบายผลให้คุณ ได้ตัวเลขที่ตรวจสอบแล้ว ในรูปแบบเฉพาะของคุณ",
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
