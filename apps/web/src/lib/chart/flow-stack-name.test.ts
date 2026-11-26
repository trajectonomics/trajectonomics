import { describe, expect, test } from "bun:test"
import { STACK_MARGIN, STACK_WIDTH, stackName } from "./flow-stack"
import { textWidth } from "./label-width"

const LINE = STACK_WIDTH - 2 * STACK_MARGIN
const GAP = 8
const JAPANESE = "家賃と生活費と教育費と医療費と交際費の合計額です"
const FAMILY = "👨‍👩‍👧‍👦"
const LONE_SURROGATE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/

/** The name and the amount fit the line, with the gap between them. */
function fits(name: string, amount: string): boolean {
	return textWidth(name, false) + GAP + textWidth(amount, false) <= LINE
}

describe("stackName", () => {
	test("keeps a plain ASCII name that fits, whole", () => {
		expect(stackName("salary", "100,000.00")).toMatchObject({ text: "salary", room: 226 })
	})

	test("shortens a long name so the name and the amount fit the line, and never the amount", () => {
		const label = "Paid out by the long named retirement account"
		const name = stackName(label, "100,000.00").text
		expect(name).toBe("Paid out by the long named re…")
		expect(fits(name, "100,000.00")).toBe(true)
	})

	test("cuts a 24-character Japanese name between whole characters", () => {
		const name = stackName(JAPANESE, "1,080,000.00").text
		expect(name.endsWith("…")).toBe(true)
		expect(JAPANESE.startsWith(name.slice(0, -1))).toBe(true)
		expect(fits(name, "1,080,000.00")).toBe(true)
	})

	test("cuts 80 Ws at a wide letter's conservative width", () => {
		const name = stackName("W".repeat(80), "21,000.00").text
		expect(name).toMatch(/^W+…$/)
		expect(fits(name, "21,000.00")).toBe(true)
	})

	test("never splits a family emoji", () => {
		const name = stackName(FAMILY.repeat(10), "171,012.54").text
		const kept = name.endsWith("…") ? name.slice(0, -1) : name
		expect(kept).toBe(FAMILY.repeat(kept.length / FAMILY.length))
		expect(name).not.toMatch(LONE_SURROGATE)
		expect(fits(name, "171,012.54")).toBe(true)
	})

	test("keeps a twin's (id) suffix in view when the name is cut", () => {
		expect(
			stackName("Salary and rent from the Bangkok apartment (salary)", "336,000.00", "(salary)")
				.text,
		).toBe("Salary and rent from…(salary)")
	})

	test("gives all the line to the amount when the amount is that long", () => {
		expect(stackName("salary", "9".repeat(40))).toMatchObject({ text: "", room: 16 })
	})
})
