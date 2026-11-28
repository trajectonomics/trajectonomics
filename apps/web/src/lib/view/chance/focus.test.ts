import { describe, expect, test } from "bun:test"
import { chanceFixture } from "./fixtures.test-support"
import { chanceFocusView } from "./focus"

describe("chanceFocusView", () => {
	test("states the chance and how long it lasts, with the Horizon's year on the tick", () => {
		const view = chanceFocusView(chanceFixture())
		expect(view.label).toBe(
			"How likely is your plan to last? 87% chance. Lasts to 2028 in 174 of 200 markets.",
		)
		expect(view.share).toBe("87%")
		expect(view.succeeded).toBe(174)
		expect(view.paths).toBe(200)
		expect(view.endYear).toBe("2028")
	})

	test("keeps every place the CLI's basis points state, through trimPercent", () => {
		expect(chanceFocusView(chanceFixture({ successBps: 9650 })).share).toBe("96.5%")
	})
})
