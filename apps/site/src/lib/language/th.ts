import type { LanguageEntry } from "./language"

/** Thai: the Language of `/th/`, and of Thailand when no tag chooses. */
export const THAI: LanguageEntry = Object.freeze({
	language: "th",
	pathPrefix: "/th",
	countries: Object.freeze(["TH"]),
	dictionary: Object.freeze({
		languageName: "ไทย",
		languageSwitchLabel: "ไทย",
		heroHeadingPrefix: "เครื่องมือเดียวที่ agent ของคุณต้องมี เพื่อ",
		heroHeadingCycle: Object.freeze(["วางแผนเกษียณอายุ", "จำลองการเงิน", "สร้างอนาคตของคุณ"] as const),
		heroVersion: "v0.1.0",
		heroLicence: "MIT · โอเพนซอร์ส",
		releaseLine: "v0.1.0 เสถียรแล้ว — traj CLI + traj-onboarding",
		releaseDate: "12 พ.ย. 2026",
		heroSubline:
			"traj คือเครื่องมือจำลองการเงินโอเพนซอร์สฟรีสำหรับ AI agent ใช้ได้ทั้งเป็นสกิลและ CLI — ทำงานบนเครื่องคุณ ไม่ต้องสร้างบัญชี ไม่มีแดชบอร์ด ไม่ต้องสมัครสมาชิก",
		docsLink: "เอกสาร",
		starMenuLabel: "ดาวบน GitHub",
		starMenuGroupLabel: "รีโป",
		starMenuAllRepos: "รีโปทั้งหมด",
		starOnboarding: "ให้ดาว traj-onboarding",
		twoPartHeading: "สองส่วน หนึ่งคำสั่ง",
		agentCardTitle: "AI agent",
		agentCardCopy: "เอเจนต์เป็นคนคุยให้",
		cliCardTitle: "traj CLI",
		cliCardCopy: "ข้อมูลเดิม คำตอบเดิม เสมอ",
		diagramConnector: "traj calc",
		stepLabels: Object.freeze([
			"1 ติดตั้งสกิล onboarding",
			"2 เปิด coding agent ของคุณ",
			"3 รันสกิล onboarding",
		] as const),
		cliDocsLink: "อ่านเอกสาร CLI",
		cliInstallLink: "ติดตั้ง CLI โดยตรง",
		copy: "คัดลอก",
		copied: "คัดลอกคำสั่งแล้ว",
		copyFailed: "เลือกคำสั่งแล้วคัดลอก",
		licence: "MIT",
		org: "trajectonomics",
		footerDisclaimer:
			"traj v0.1.0 เป็นรุ่นเสถียรรุ่นแรก ยังอาจมีบั๊ก ระบบจะคำนวณภาษีเมื่อคุณขอเท่านั้น และทุกตัวเลขบอกว่ารวมภาษีหรือไม่ เชื่อตัวเลขที่ traj ส่งกลับ หากพบบั๊ก ให้เปิด issue ที่ https://github.com/trajectonomics/cli แล้วเราจะอัปเดตโดยเร็ว",
		notFoundHeading: "ไม่พบหน้านี้",
		notFoundBody: "ลิงก์นี้อาจถูกย้ายหรือพิมพ์ผิด",
	}),
	ownerWritten: Object.freeze([] as const),
})
