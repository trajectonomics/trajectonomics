import { describe, expect, test } from "bun:test"
import { restoreRadios, restoreSelect, restoreSwitch } from "./restore"

// The tests run without a DOM, so each control is a plain object with the one property the page sets.
describe("a refused change puts its control back", () => {
	test("a switch shows what the page holds, on or off", () => {
		const control = { checked: false }
		restoreSwitch(control, true)
		expect(control.checked).toBe(true)
		restoreSwitch(control, false)
		expect(control.checked).toBe(false)
	})

	test("a select shows the plan the page still shows", () => {
		const control = { value: "retire-early" }
		restoreSelect(control, "base")
		expect(control.value).toBe("base")
	})

	test("a radio group checks only the option the page holds", () => {
		const radios = [
			{ value: "base", checked: false },
			{ value: "retire-early", checked: true },
		]
		restoreRadios(radios, "base")
		expect(radios.map((radio) => radio.checked)).toEqual([true, false])
	})
})
