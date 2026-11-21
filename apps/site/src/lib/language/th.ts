import { releaseFor } from "../site/release-snapshot"
import type { LanguageEntry } from "./language"
import { THAI_SECTIONS } from "./th-sections"

/** The release strings Thai prints, from the committed Release snapshot. */
const RELEASE = releaseFor("th")

/** Thai: the Language of Thailand when no tag chooses; its home is a build path, not an address. */
export const THAI: LanguageEntry = Object.freeze({
	language: "th",
	buildPath: "th",
	locale: "th_TH",
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
		heroVersion: RELEASE.heroVersion,
		heroLicence: "MIT · โอเพนซอร์ส",
		releaseLine: RELEASE.releaseLine,
		releaseDate: RELEASE.releaseDate,
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
		cliInstallLink: "ติดตั้ง CLI โดยตรง",
		copy: "คัดลอกพรอมต์ให้เอเจนต์ของคุณ",
		copied: "คัดลอกพรอมต์แล้ว",
		copiedLabel: "คัดลอกแล้ว",
		copyFailed: "เลือกพรอมต์แล้วคัดลอก",
		licence: "MIT",
		org: "trajectonomics",
		footerDisclaimer:
			"ยังอาจมีบั๊ก ระบบจะคำนวณภาษีเมื่อคุณขอเท่านั้น และทุกตัวเลขบอกว่ารวมภาษีหรือไม่ เชื่อตัวเลขที่ traj ส่งกลับ หากพบบั๊ก ให้เปิด issue ที่ https://github.com/trajectonomics/cli แล้วเราจะอัปเดตโดยเร็ว",
		notFoundHeading: "ไม่พบหน้านี้",
		notFoundBody: "ลิงก์นี้อาจถูกย้ายหรือพิมพ์ผิด",
	}),
	ownerWritten: Object.freeze([] as const),
})
