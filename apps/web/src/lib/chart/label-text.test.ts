import { describe, expect, test } from "bun:test"
import { placedLabels } from "./label-rows"
import { bareArea, chartArea } from "./label-rows.test-support"

// The words a label keeps when its room is short. A neighbour's rule at `next` leaves `next - 104` pixels,
// and the plot's left edge is placed to leave as many, so the label shortens on its preferred right side.
function first(label: string, next: number, code = false): string {
	const marks = [
		{ x: 100, label, code },
		{ x: next, label: "k" },
	]
	return placedLabels(marks, { width: 600, left: 200 - next, right: 600 })[0]?.text ?? ""
}

/** The label of the middle of three rules, which has `room` pixels on each side. */
function between(label: string, room: number): string {
	const x = 300
	const marks = [x - room - 4, x, x + room + 4].map((at) => ({ x: at, label }))
	return placedLabels(marks, bareArea(900))[1]?.text ?? ""
}

describe("a shortened marker label", () => {
	test("reserves the sans-serif ellipsis width, and the narrower monospace one for a code label", () => {
		// 46px before the rule at 150: five characters and the 12px sans-serif ellipsis (47px) do not fit.
		expect(first("abcdefghij", 150)).toBe("abcd…")
		// The same room in monospace: five characters and the 7px ellipsis (42px) fit.
		expect(first("abcdefghij", 150, true)).toBe("abcde…")
	})

	test("reserves more room for a wide sans-serif letter, which monospace draws like any other", () => {
		// 46px: three 12px "m"s do not fit beside the ellipsis, five monospace ones do.
		expect(first("mmmmmmmm", 150)).toBe("mm…")
		expect(first("mmmmmmmm", 150, true)).toBe("mmmmm…")
		// Capitals are 10px: three and the ellipsis are 42px, four are 52px.
		expect(first("ABCDEFGH", 150)).toBe("ABC…")
		expect(first("家家家家家家", 150)).toBe("家家…")
	})

	test("cuts Thai text between clusters, never inside one", () => {
		// "ซื้อบ้านหลังแรก" is clusters ซื้, อ, บ้, า, น, ...; 26px fits the first two and the ellipsis.
		expect(first("ซื้อบ้านหลังแรก", 130)).toBe("ซื้อ…")
	})

	test("keeps a Thai tone mark with its base", () => {
		// 19px fits one cluster and the ellipsis: "ผ่", the base with its tone mark, not "ผ" alone.
		expect(first("ผ่อนรถหมดแล้ว", 123)).toBe("ผ่…")
	})

	test("never ends on a Thai leading vowel, which belongs to the consonant after it", () => {
		// 26px fits "เก" and the ellipsis; 33px would fit "ขอเ", which must not be cut there.
		expect(first("เกษียณ", 130)).toBe("เก…")
		expect(first("ขอเกษียณ", 137)).toBe("ขอ…")
	})

	test("stubs a Thai label with its leading vowel and consonant together, or not at all", () => {
		expect(between("เกษียณ", 14)).toBe("เก")
		expect(between("เกษียณ", 13)).toBe("")
		expect(between("แต่งงาน", 7)).toBe("")
	})

	test("never leaves a lone surrogate of an emoji", () => {
		// 73px fits the eight ASCII characters and the ellipsis, but not the emoji's 16px: the whole emoji goes.
		const text = first("pay-off-🏠-loan", 177)
		expect(text).toBe("pay-off-…")
		expect(text).not.toMatch(
			/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/,
		)
	})

	test("keeps both of Plans' two Demo labels off the rules at 360px", () => {
		// Plans' card at 360px holds a 294px chart, and the Demo's base plan reaches its two Milestones at
		// these x. Both ids are drawn in code, whose ellipsis is one monospace cell. The second prefers the
		// left, but its rule leaves more room right (119px against 61px), so it shortens there.
		const marks = [
			{ x: 89.14581430745815, label: "car-paid-off", code: true },
			{ x: 154.46412988330798, label: "net-worth-ten-million", code: true },
		]
		const placed = placedLabels(marks, chartArea(294))
		expect(placed.map((label) => label.text)).toEqual(["car-pai…", "net-worth-ten-mi…"])
		expect(placed.map((label) => label.leftwards)).toEqual([false, false])
		expect(placed.map((label) => label.row)).toEqual([0, 0])
	})
})
