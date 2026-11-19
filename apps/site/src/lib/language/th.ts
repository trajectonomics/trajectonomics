import { CLI_VERSION, ONBOARDING_VERSION } from "../site"
import type { LanguageEntry } from "./language"
import { THAI_SECTIONS } from "./th-sections"

/** Thai: the Language of `/th/`, and of Thailand when no tag chooses. */
export const THAI: LanguageEntry = Object.freeze({
	language: "th",
	pathPrefix: "/th",
	countries: Object.freeze(["TH"]),
	dictionary: Object.freeze({
		...THAI_SECTIONS,
		documentTitle: "traj — เครื่องมือจำลองการเงินโอเพนซอร์สฟรีสำหรับ AI agent",
		description:
			"traj คือเครื่องมือจำลองการเงินโอเพนซอร์สฟรีสำหรับ AI agent — CLI และสกิลที่ทำงานบนเครื่องคุณ ไม่ต้องสร้างบัญชี ไม่มีแดชบอร์ด",
		languageName: "ไทย",
		languageSwitchLabel: "ไทย",
		heroHeadingPrefix: "ชุดเครื่องมือสำหรับ",
		heroHeadingAccent: "การวางแผนการเงิน",
		heroVersion: CLI_VERSION,
		heroLicence: "MIT · โอเพนซอร์ส",
		releaseLine: `เสถียร: traj CLI ${CLI_VERSION} · traj-onboarding ${ONBOARDING_VERSION}`,
		releaseDate: "17 พ.ย. 2026",
		heroSubline:
			"traj คือเครื่องมือจำลองการเงินโอเพนซอร์สฟรีสำหรับ AI agent ใช้ได้ทั้งเป็นสกิลและ CLI — ทำงานบนเครื่องคุณ ไม่ต้องสร้างบัญชี ไม่มีแดชบอร์ด ไม่ต้องสมัครสมาชิก",
		factLabels: Object.freeze(["สกุลเงิน", "ครั้งแรก", "เอเจนต์"] as const),
		factTexts: Object.freeze([
			"ตอนนี้ใช้ได้เฉพาะเงินบาท",
			"ดาวน์โหลดประมาณ 100 MB ครั้งเดียว",
			"เอเจนต์เขียนโค้ดที่รันคำสั่งได้ เช่น Claude Code, Codex หรือ Cursor",
		] as const),
		docsLink: "เอกสาร",
		starMenuLabel: "ดาวบน GitHub",
		starMenuGroupLabel: "รีโป",
		starMenuAllRepos: "รีโปทั้งหมด",
		starOnboarding: "ให้ดาว traj-onboarding",
		cliDocsLink: "อ่านเอกสาร CLI",
		cliInstallLink: "ติดตั้ง CLI โดยตรง",
		copy: "คัดลอกพรอมต์ให้เอเจนต์ของคุณ",
		copied: "คัดลอกพรอมต์แล้ว",
		copiedLabel: "คัดลอกแล้ว",
		copyFailed: "เลือกพรอมต์แล้วคัดลอก",
		licence: "MIT",
		org: "trajectonomics",
		footerDisclaimer: `traj ${CLI_VERSION} เป็นรุ่นเสถียรล่าสุด ยังอาจมีบั๊ก ระบบจะคำนวณภาษีเมื่อคุณขอเท่านั้น และทุกตัวเลขบอกว่ารวมภาษีหรือไม่ เชื่อตัวเลขที่ traj ส่งกลับ หากพบบั๊ก ให้เปิด issue ที่ https://github.com/trajectonomics/cli แล้วเราจะอัปเดตโดยเร็ว`,
		notFoundHeading: "ไม่พบหน้านี้",
		notFoundBody: "ลิงก์นี้อาจถูกย้ายหรือพิมพ์ผิด",
	}),
	ownerWritten: Object.freeze([] as const),
})
