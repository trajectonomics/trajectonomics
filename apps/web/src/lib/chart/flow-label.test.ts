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
		expect(fittedLabel({ ...RIGHT, label: "housing" }, "30,000.00")).toEqual({
			label: "housing",
			amount: "30,000.00",
		})
	})

	test("shortens a long name with an ellipsis and keeps the whole amount", () => {
		// Right: 202 units less the amount's 70 leaves 132, so 17 of the name and the ellipsis.
		expect(fittedLabel({ ...RIGHT, label: LONG }, "30,000.00")).toEqual({
			label: "housing, utilitie…",
			amount: "30,000.00",
		})
		// Left: 214 units, so 18 of the name.
		expect(fittedLabel({ ...LEFT, label: LONG }, "30,000.00")).toEqual({
			label: "housing, utilities…",
			amount: "30,000.00",
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

	test("keeps a twin's (id) suffix in view when the name is cut", () => {
		const right = fittedLabel({ ...RIGHT, label: TWIN }, "336,000.00")
		expect(right.label).toBe("Salary…(salary)")
		const left = fittedLabel({ ...LEFT, label: TWIN }, "336,000.00")
		expect(left.label.endsWith("(salary)")).toBe(true)
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
