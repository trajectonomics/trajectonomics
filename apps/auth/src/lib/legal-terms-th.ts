import type { LegalContent } from "./legal"
import { SOURCE_URL } from "./site"

/** The terms page's Thai text. The English page is the official version. */
export const TERMS_TH: LegalContent = Object.freeze({
	updated: "27 พฤศจิกายน 2569",
	sections: [
		{
			heading: "บริการ",
			body: ["บริการบัญชี Trajectonomics ใช้งานฟรี ใช้สำหรับเข้าสู่ระบบและให้แอปที่คุณอนุมัติใช้บัญชีของคุณ"],
		},
		{
			heading: "ตามสภาพที่เป็น",
			body: [
				"บริการนี้ให้ตามสภาพที่เป็น โดยไม่มีการรับประกัน เราพยายามให้บริการใช้งานได้และถูกต้อง แต่ไม่สัญญาว่าจะไม่ล้มเหลวเลย",
			],
		},
		{
			heading: "บัญชีของคุณ",
			body: ["โปรดรักษาอีเมลและพาสคีย์ของคุณให้ปลอดภัย คุณรับผิดชอบสิ่งที่เกิดขึ้นผ่านบัญชีของคุณ"],
		},
		{
			heading: "โค้ด",
			body: ["โค้ดของบริการนี้เป็นโอเพนซอร์สภายใต้ AGPL-3.0-only อ่านได้ที่นี่"],
			link: { text: "github.com/trajectonomics/trajectonomics", href: SOURCE_URL },
		},
		{
			heading: "การเปลี่ยนแปลง",
			body: ["เราอาจเปลี่ยนข้อกำหนดเหล่านี้ได้ วันที่ด้านบนบอกว่าแก้ไขล่าสุดเมื่อใด"],
		},
	],
})
