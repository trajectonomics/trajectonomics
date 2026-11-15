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
		heroHeadingCycle: Object.freeze([
			"วางแผนเกษียณอายุ",
			"คาดการณ์อนาคตทางการเงิน",
			"สร้างอนาคตของคุณ",
		] as const),
		heroRelease: "v0.1.0 เสถียรแล้ว — traj CLI + traj-onboarding",
		heroReleaseDate: "12 พ.ย. 2026",
		heroSubline:
			"traj คือเครื่องมือวางแผนการเงินโอเพนซอร์สฟรีสำหรับ AI agent ติดตั้งเป็นสกิลได้ในคำสั่งเดียว แล้วให้ agent จัดการส่วนที่เหลือ — ไม่ต้องสร้างบัญชี ไม่มีแดชบอร์ด ไม่ต้องสมัครสมาชิก",
		docsLink: "เอกสาร",
		starMenuLabel: "ให้ดาว",
		starOnboarding: "ให้ดาว traj-onboarding",
		twoPartHeading: "สองส่วน หนึ่งคำสั่ง",
		skillsCardTitle: "สกิล",
		skillsCardBody: "คำสั่งที่ agent ของคุณทำตาม ปรับให้เข้ากับวิธีทำงานของคุณ และ agent เป็นผู้เลือกใช้เมื่อเหมาะสม",
		cliCardTitle: "traj CLI",
		cliCardBody: "ส่วนคำนวณ ข้อมูลเข้าเดียวกันได้คำตอบเดิมทุกครั้ง agent หรือสคริปต์จึงเชื่อถือได้ และไม่เรียกโมเดลเลย",
		cliDocsLink: "อ่านเอกสาร CLI",
		twoPartFootnote: "คำสั่งเดียวติดตั้ง traj-onboarding ซึ่งจะติดตั้ง CLI และสกิล traj ให้คุณ",
		nextStep: "เปิด coding agent ของคุณแล้ววางคำสั่งนี้ traj-onboarding จะถามเรื่องการเงินของคุณแล้วเริ่มให้เลย",
		copy: "คัดลอก",
		copied: "คัดลอกแล้ว",
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
