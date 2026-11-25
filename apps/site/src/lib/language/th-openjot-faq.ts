import { OPENJOT_SIGNING_FINGERPRINT } from "../site/openjot"
import type { OpenJotFaqWords } from "./openjot-dictionary"

/** The Thai FAQ of the OpenJot page, ported from the app's own landing page (ADR 0032). */
export const THAI_OPENJOT_FAQ: OpenJotFaqWords = Object.freeze({
	faqEyebrow: "คำถาม",
	faqHeading: "คำถามที่พบบ่อย",
	faqQuestions: Object.freeze([
		"MooJot เปลี่ยนชื่อเป็นอะไร?",
		"ติดตั้งนอก Play Store ปลอดภัยไหม?",
		"ใช้กับ iPhone ได้ไหม?",
		"ต้องต่ออินเทอร์เน็ตไหม?",
		"เสียเงินไหม?",
		"อัปเดตแอปยังไง?",
	] as const),
	faqAnswers: Object.freeze([
		"MooJot เปลี่ยนชื่อเป็น OpenJot แล้ว เป็นแอปเดิมโดย Trajectonomics ติดตั้งเวอร์ชันใหม่ทับ MooJot แล้วรายการของคุณยังอยู่ครบ",
		`ไฟล์ APK สร้างโดย GitHub Actions จากซอร์สโค้ดสาธารณะ เซ็นด้วยคีย์ของโปรเจกต์ และมี SHA256SUMS ให้ตรวจ คุณเปิดอ่านโค้ดได้ทุกบรรทัด ใบรับรองของคีย์คือ CN=MooJot ซึ่งเป็นชื่อเดิมของแอป ลายนิ้วมือ SHA-256 ${OPENJOT_SIGNING_FINGERPRINT} ทุกเวอร์ชันต่อจากนี้เซ็นด้วยคีย์เดียวกันนี้ ถ้าลายนิ้วมือไม่ตรง อย่าติดตั้ง สายเทคนิคตรวจเองได้ด้วย apksigner verify --print-certs openjot-android-arm64.apk`,
		"ยังไม่ได้ ตอนนี้มีเฉพาะ Android 7.0 ขึ้นไปที่เป็นมือถือ 64 บิต (มือถือเกือบทุกรุ่นที่ขายตั้งแต่ราวปี 2017 เป็น 64 บิต)",
		"ไม่ต้อง การอ่านสลิป OCR และการแยกหมวดทำในเครื่องทั้งหมด เมื่อต่อเน็ตอยู่ ML Kit ของ Google ที่ช่วยอ่านภาษาอังกฤษบนสลิปจะส่งสถิติการใช้งาน เช่น รุ่นมือถือและเวอร์ชันแอป ให้ Google (ไม่ส่งรูปหรือข้อความในสลิป) และถ้าคุณเลือกเปิดส่งสถิติการใช้งานแบบไม่ระบุตัวตน (ไม่มีรายการหรือยอดเงิน) แอปจะส่งตอนต่อเน็ตเช่นกัน",
		"ไม่เสียเลย ไม่มีโฆษณา ไม่มีแพ็กเกจรายเดือน และเป็นโอเพนซอร์สภายใต้สัญญาอนุญาต MIT",
		"โหลดไฟล์ใหม่จากหน้านี้แล้วติดตั้งทับของเดิม ข้อมูลเดิมยังอยู่ครบ",
	] as const),
})
