import { describe, expect, test } from "bun:test"
import { FLOW_MARGIN } from "./flow-geometry"
import { fittedLabel, labelRoom } from "./flow-label"
import { textWidth } from "./label-width"

// A right-hand label starts at x=590 in an 800-wide box with an 8 margin: 202 units of room.
const RIGHT = { labelX: 590, anchor: "start" as const }
// A left-hand label ends at x=222: 214 units from the margin.
const LEFT = { labelX: 222, anchor: "end" as const }

const LONG = "housing, utilities and the shared apartment fees"
const JAPANESE = "家賃と生活費と教育費と医療費と交際費の合計額です"
const WIDE = "W".repeat(80)
const FAMILY = "👨‍👩‍👧‍👦"
const TWIN = "Salary and rent from the Bangkok apartment (salary)"
const LONE_SURROGATE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/

/** The estimated width of what the diagram draws for a node, in the chart's units. */
function drawnWidth(drawn: ReturnType<typeof fittedLabel>): number {
	const words = drawn.label === "" ? drawn.amount : `${drawn.label} ${drawn.amount}`
	return textWidth(words, false)
}

describe("fittedLabel", () => {
	test("keeps a plain ASCII label that fits, whole", () => {
		expect(fittedLabel({ ...RIGHT, label: "housing" }, "30,000.00")).toMatchObject({
			label: "housing",
			amount: "30,000.00",
		})
	})

	test("shortens a long name with an ellipsis and keeps the whole amount", () => {
		// Right: 202 units less the amount's 63 and a 4-unit gap leaves 135, so 17 letters and the ellipsis.
		// The clip reaches 2 units past the fitted name on each side, so a glyph is not shaved.
		expect(fittedLabel({ ...RIGHT, label: LONG }, "30,000.00")).toMatchObject({
			label: "housing, utilitie…",
			amount: "30,000.00",
			amountX: 788,
			clipX: 588,
			clipWidth: 135,
		})
		// Left: 214 units, so 18 letters.
		expect(fittedLabel({ ...LEFT, label: LONG }, "30,000.00")).toMatchObject({
			label: "housing, utilities…",
			amount: "30,000.00",
			amountX: 222,
			clipX: 6,
			clipWidth: 151,
		})
	})

	test("cuts a 24-character Japanese label between whole characters and keeps the amount", () => {
		const drawn = fittedLabel({ ...RIGHT, label: JAPANESE }, "1,080,000.00")
		expect(drawn.label.endsWith("…")).toBe(true)
		expect(JAPANESE.startsWith(drawn.label.slice(0, -1))).toBe(true)
		expect(drawn.amount).toBe("1,080,000.00")
	})

	test("cuts 80 Ws at a wide letter's conservative width", () => {
		const drawn = fittedLabel({ ...RIGHT, label: WIDE }, "21,000.00")
		expect(drawn.label).toMatch(/^W+…$/)
		expect(drawn.label.length).toBeLessThan(WIDE.length)
	})

	test("never splits a family emoji", () => {
		const drawn = fittedLabel({ ...RIGHT, label: FAMILY.repeat(10) }, "171,012.54")
		expect(drawn.label.endsWith("…")).toBe(true)
		const kept = drawn.label.slice(0, -1)
		expect(kept).toBe(FAMILY.repeat(kept.length / FAMILY.length))
		expect(drawn.label).not.toMatch(LONE_SURROGATE)
	})

	test("cuts a twin's id with the name, so ids that differ at the start stay distinct", () => {
		const label = (start: string) => `Saving (${start}-from-the-bank) into Bank`
		const one = fittedLabel({ ...RIGHT, label: label("a0") }, "1.00").label
		const two = fittedLabel({ ...RIGHT, label: label("a1") }, "1.00").label
		expect(one).toContain("(a0-")
		expect(two).toContain("(a1-")
		expect(one).not.toBe(two)
	})

	test("measures the page's own font when one is given, and keeps a label the estimate would cut", () => {
		const measure = (text: string) => text.length * 4
		const short = { ...RIGHT, label: "HOME LOAN AND CONDO FEES" }
		expect(fittedLabel(short, "171,012.54", measure)).toMatchObject({
			label: "HOME LOAN AND CONDO FEES",
			amount: "171,012.54",
		})
		// The estimate reserves 9 px a capital and cuts it; the measured 4 px a character holds it whole.
		expect(fittedLabel(short, "171,012.54").label).toMatch(/…$/)
	})

	test("cuts an ordinary name ending in brackets normally, with no suffix kept", () => {
		const label = "Condo common area fees (annual, paid in January)"
		const drawn = fittedLabel({ ...RIGHT, label }, "30,000.00")
		expect(drawn.label).toBe("Condo common ar…")
	})

	test("every label it draws stays inside the box on its side", () => {
		const names = ["a", LONG, JAPANESE, WIDE, FAMILY.repeat(10), TWIN]
		for (const side of [RIGHT, LEFT]) {
			for (const label of names) {
				const drawn = fittedLabel({ ...side, label }, "1,234,567.89")
				expect(drawnWidth(drawn)).toBeLessThanOrEqual(labelRoom(side))
			}
		}
	})

	test("gives the room from the anchor to the edge on that side", () => {
		expect(labelRoom(RIGHT)).toBe(202)
		expect(labelRoom(LEFT)).toBe(214)
		expect(FLOW_MARGIN).toBe(8)
	})
})
