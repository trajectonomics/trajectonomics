import type { OpenJotPrivacyWords } from "./openjot-dictionary"

/**
 * The Thai words of the OpenJot page's Privacy section, kept verbatim from the app's own landing
 * page: the port claims exactly what that page claimed, and nothing more (ADR 0032).
 */
export const THAI_OPENJOT_PRIVACY: OpenJotPrivacyWords = Object.freeze({
	privacyEyebrow: "ความเป็นส่วนตัว",
	privacyHeading: "เรื่องเงิน เป็นเรื่องของคุณ",
	privacyTitles: Object.freeze([
		"ไม่ต้องมีบัญชี",
		"อยู่ในเครื่องเท่านั้น",
		"อ่านเฉพาะอัลบั้มสลิป",
		"ไม่มีโฆษณา ไม่แอบเก็บข้อมูล",
	] as const),
	privacyCopies: Object.freeze([
		"ไม่ต้องสมัคร ไม่ต้องล็อกอิน เปิดแล้วใช้ได้เลย",
		"บัญชีรายรับรายจ่ายเก็บในมือถือคุณ ไม่มีเซิร์ฟเวอร์ของ OpenJot ให้ส่งไป",
		"ค่าเริ่มต้นจะไม่เปิดรูปจากกล้อง ภาพหน้าจอ หรือโฟลเดอร์ดาวน์โหลดเลย",
		"OpenJot ไม่ส่งข้อมูลการใช้งานของตัวเอง เว้นแต่คุณเลือกเปิดส่งสถิติแบบไม่ระบุตัวตน และไม่ส่งรายการหรือยอดเงินแน่นอน ส่วน ML Kit ของ Google ที่ช่วยอ่านภาษาอังกฤษบนสลิปจะส่งสถิติการใช้งานของมันเองให้ Google โดยไม่ส่งรูปหรือข้อความในสลิป เว็บนี้ใช้คุกกี้เฉพาะเมื่อคุณอนุญาต",
	] as const),
	privacyPolicyLink: "นโยบายความเป็นส่วนตัว",
	termsLink: "ข้อตกลงการใช้งาน",
	privacyContactLink: "ติดต่อเรื่องความเป็นส่วนตัว",
})
