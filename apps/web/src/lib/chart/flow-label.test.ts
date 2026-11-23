import { describe, expect, test } from "bun:test"
import { FLOW_MARGIN } from "./flow-geometry"
import { fittedLabel, LABEL_CHAR_WIDTH, labelRoom } from "./flow-label"

// A right-hand label starts at x=590 in an 800-wide box with an 8 margin: 202 units, so 26 characters at 7.5.
const RIGHT = { labelX: 590, anchor: "start" as const }
// A left-hand label ends at x=222: 214 units from the margin, so 28 characters.
const LEFT = { labelX: 222, anchor: "end" as const }

describe("fittedLabel", () => {
	test("keeps a label that fits, whole", () => {
		expect(fittedLabel({ ...RIGHT, label: "housing" }, "30,000.00")).toBe("housing 30,000.00")
	})

	test("shortens a long name with an ellipsis and keeps the whole amount", () => {
		const label = "housing, utilities and the shared apartment fees"
		// Right: 26 characters of room; the amount is 9, a space and an ellipsis take 2, so 15 of the name.
		expect(fittedLabel({ ...RIGHT, label }, "30,000.00")).toBe("housing, utilit… 30,000.00")
		// Left: 28 characters of room, so 17 of the name.
		expect(fittedLabel({ ...LEFT, label }, "30,000.00")).toBe("housing, utilitie… 30,000.00")
	})

	test("every label it draws stays inside the box on its side", () => {
		const names = ["a", "groceries and eating out with the whole family", "x".repeat(200)]
		for (const side of [RIGHT, LEFT]) {
			for (const label of names) {
				const text = fittedLabel({ ...side, label }, "1,234,567.89")
				const width = text.length * LABEL_CHAR_WIDTH
				const [from, to] =
					side.anchor === "end"
						? [side.labelX - width, side.labelX]
						: [side.labelX, side.labelX + width]
				expect(from).toBeGreaterThanOrEqual(FLOW_MARGIN)
				expect(to).toBeLessThanOrEqual(800 - FLOW_MARGIN)
			}
		}
	})

	test("gives the room from the anchor to the edge on that side", () => {
		expect(labelRoom(RIGHT)).toBe(202)
		expect(labelRoom(LEFT)).toBe(214)
	})
})
