import { describe, expect, test } from "bun:test"
import { clickedBackdrop } from "./backdrop"

describe("a click on the Display options dialog", () => {
	const dialog = { open: true }

	test("closes the drawer when it lands on the backdrop, which is the dialog itself", () => {
		expect(clickedBackdrop(dialog, dialog)).toBe(true)
	})

	test("does not close the drawer when it lands on a switch, a heading or the close button", () => {
		expect(clickedBackdrop({}, dialog)).toBe(false)
		expect(clickedBackdrop(null, dialog)).toBe(false)
	})
})
