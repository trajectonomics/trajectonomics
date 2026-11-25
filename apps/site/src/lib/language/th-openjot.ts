import type { OpenJotDictionary, OpenJotLanguageEntry } from "./openjot-dictionary"
import { THAI_OPENJOT_FAQ } from "./th-openjot-faq"
import { THAI_OPENJOT_PRIVACY } from "./th-openjot-privacy"

/** The Thai words of the OpenJot page, ported from the app's own landing page (ADR 0032). */
const THAI_OPENJOT_DICTIONARY: OpenJotDictionary = Object.freeze({
	documentTitle: "OpenJot — แอปจดรายรับรายจ่ายฟรีสำหรับ Android",
	description:
		"OpenJot คือแอป Android ฟรีและโอเพนซอร์สที่อ่านสลิปธนาคารไทย แล้วจดเป็นรายรับรายจ่ายในมือถือคุณ ไม่ต้องสมัคร",
	heroEyebrow: "ฟรี · โอเพนซอร์ส · สำหรับ Android",
	heroHeadingPrefix: "โอนปุ๊บ",
	heroHeadingAccent: "OpenJot จดให้ปั๊บ",
	heroLede:
		"OpenJot อ่านสลิปที่แอปธนาคารบันทึกไว้ในมือถือ แล้วจดรายจ่ายพร้อมแยกหมวดให้เอง ทุกอย่างทำในเครื่องคุณ ไม่ต้องสมัคร ไม่มีโฆษณา ฟรีทุกฟีเจอร์",
	downloadCta: "ดาวน์โหลดสำหรับ Android",
	installCta: "ดูวิธีติดตั้ง",
	requirement: "ไฟล์ APK · Android 7.0 ขึ้นไป (64 บิต)",
	releasesLink: "เวอร์ชันและไฟล์ตรวจสอบ",
	inAppTitle: "เปิดจากในแอป Instagram, LINE หรือ Facebook อยู่ใช่ไหม?",
	inAppText: "แตะ ⋮ หรือ ⋯ มุมขวาบน แล้วเลือก “เปิดในเบราว์เซอร์” ก่อนดาวน์โหลด ไฟล์จะโหลดได้ชัวร์กว่า",
	screensEyebrow: "หน้าตา",
	screensHeading: "หน้าตาในแอป",
	screenCaptions: Object.freeze([
		"จดให้ทุกวัน",
		"เงินไปไหนหมด",
		"หน้าแรกในภาษาไทย",
		"จดรายการเองด้วยมือ",
	] as const),
	screenAlts: Object.freeze([
		"หน้าแรก: ไทม์ไลน์รายจ่ายของวัน พร้อมหมวดของแต่ละรายการ",
		"สรุป: แผนภูมิวงกลมของรายจ่ายแยกตามหมวด พร้อมยอดรวมของเดือนตรงกลาง",
		"หน้าแรกภาษาไทย: ไทม์ไลน์เดียวกัน กับป้ายในแอปที่เป็นภาษาไทย",
		"เพิ่มรายการ: ฟอร์มสำหรับรายจ่ายใหม่ มีช่องจำนวนเงิน หมวด แท็ก และโน้ต",
	] as const),
	screensNote: "ข้อมูลในภาพเป็นตัวอย่าง",
	featuresEyebrow: "ฟีเจอร์",
	featuresHeading: "OpenJot ทำอะไรได้บ้าง",
	featureTitles: Object.freeze([
		"อ่านสลิปได้ 20 แอป",
		"แยกหมวดให้เอง",
		"รู้ว่าโอนเข้าบัญชีตัวเอง",
		"สรุป เทียบ และตั้งงบ",
		"นำเข้าบิลบัตรเครดิต",
		"ข้อมูลเป็นของคุณ",
	] as const),
	featureCopies: Object.freeze([
		"K PLUS, SCB EASY, Krungthai NEXT, MAKE, TrueMoney, Dime! และอีกเพียบ อ่าน QR และข้อความภาษาไทยด้วย OCR ในเครื่อง",
		"มีกฎร้านค้าไทยและอังกฤษในตัว 247 ข้อ ตั้งแต่ 7-Eleven ถึง BTS แก้หมวดครั้งเดียว OpenJot จำไว้ใช้ครั้งหน้า",
		"ย้ายเงินข้ามธนาคารของตัวเองไม่ใช่รายจ่าย OpenJot ดูออกและไม่นับซ้ำ",
		"โดนัทแยกตามหมวดหรือแท็ก เทียบย้อนหลัง 6 เดือน และงบที่บอกว่ายังใช้ได้อีกวันละเท่าไหร่",
		"นำเข้า e-Statement PDF ที่ล็อกรหัสไว้ได้ ทั้ง KBank, SCB, KTC, Krungsri, BBL, ttb, UOB และ AEON",
		"ส่งออก CSV หรือ JSON ได้ตลอด ใช้ได้ทั้งไทยและอังกฤษ เลือกธีมชมพูหรือดำส้ม",
	] as const),
	...THAI_OPENJOT_PRIVACY,
	installEyebrow: "ติดตั้ง",
	installHeading: "ติดตั้งใน 3 ขั้นตอน",
	installLede: "OpenJot ยังไม่อยู่บน Play Store เลยติดตั้งจากไฟล์ APK แทน ใช้เวลาไม่ถึงนาที",
	stepTitles: Object.freeze(["ดาวน์โหลดไฟล์", "อนุญาตให้ติดตั้ง", "เปิดแอป ให้ OpenJot อ่านสลิป"] as const),
	stepCopies: Object.freeze([
		"แตะปุ่มดาวน์โหลด ถ้า Chrome ขึ้นว่า “ไฟล์นี้อาจเป็นอันตราย” ให้แตะ “ดาวน์โหลดต่อ” ไฟล์มาจากหน้า Releases บน GitHub ของโปรเจกต์โดยตรง",
		"แตะไฟล์ที่โหลดเสร็จ ถ้า Android ไม่ให้ติดตั้งแอปที่ไม่รู้จัก แตะ “การตั้งค่า” → เปิด “อนุญาตจากแหล่งที่มานี้” → กลับมาแตะ “ติดตั้ง”",
		"อนุญาตให้ OpenJot เข้าถึงรูปภาพ แล้วดึงหน้าแรกลง OpenJot จะอ่านสลิปจากอัลบั้มของแอปธนาคารแล้วจดให้ครบ ไม่ต้องใช้อินเทอร์เน็ต",
	] as const),
	installTip: "ถ้า Play Protect เตือน แตะ “รายละเอียดเพิ่มเติม” → “ติดตั้งต่อไป”",
	updateNote: "อัปเดต: โหลดไฟล์ใหม่จากหน้านี้แล้วติดตั้งทับได้เลย ข้อมูลเดิมอยู่ครบ เพราะทุกเวอร์ชันเซ็นด้วยคีย์เดียวกัน",
	checkFileText:
		"ทุกเวอร์ชันมีไฟล์ SHA256SUMS ให้เทียบ และเซ็นด้วยคีย์ของโปรเจกต์ CN=MooJot (ชื่อเดิมของแอป) ลายนิ้วมือ SHA-256",
	checksumsLink: "ตรวจไฟล์ SHA256SUMS",
	checkFileWarning: "ถ้าเจอไฟล์ APK ของ OpenJot ที่ลายนิ้วมือไม่ตรงนี้ อย่าติดตั้ง",
	...THAI_OPENJOT_FAQ,
	closingHeading: "ให้ OpenJot ช่วยจดตั้งแต่วันนี้",
	closingLede: "ฟรี โอเพนซอร์ส และทุกรายการอยู่ในมือถือคุณ",
	ossLink: "โอเพนซอร์ส · ดูโค้ดบน GitHub",
})

/** Thai's OpenJot page: the Language's own build path under `openjot/`. */
export const THAI_OPENJOT: OpenJotLanguageEntry = Object.freeze({
	language: "th",
	buildPath: "th",
	dictionary: THAI_OPENJOT_DICTIONARY,
})
