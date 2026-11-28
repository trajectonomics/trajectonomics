import { describe, expect, test } from "bun:test"
import { keepFocus } from "../../client/focus"
import { Reorder } from "../../client/reorder.svelte.js"

describe("reordering by keyboard", () => {
	test("Up and Down change the order here and wait for Done; Cancel puts the saved order back", () => {
		const saved = ["a", "b", "c"]
		const reorder = new Reorder<string>(saved)
		reorder.press(0, -1)
		expect(reorder.changed(saved)).toBe(false)
		reorder.press(2, -1)
		expect(reorder.items).toEqual(["a", "c", "b"])
		expect(reorder.changed(saved)).toBe(true)
		reorder.press(0, 1)
		expect(reorder.items).toEqual(["c", "a", "b"])
		reorder.reset(saved)
		expect(reorder.changed(saved)).toBe(false)
	})

	test("pressing Down twice on one row moves that row down twice, because each row keeps its key as it moves", () => {
		const reorder = new Reorder<string>(["a", "b", "c"])
		const [first] = reorder.rows
		if (first === undefined) throw new Error("the list has rows")
		reorder.press(first.key, 1)
		expect(reorder.items).toEqual(["b", "a", "c"])
		reorder.press(first.key, 1)
		expect(reorder.items).toEqual(["b", "c", "a"])
		// At the edge a third press changes nothing, and a press on the row now first moves that row.
		reorder.press(first.key, 1)
		expect(reorder.items).toEqual(["b", "c", "a"])
		reorder.press(reorder.rows[0]?.key ?? -1, 1)
		expect(reorder.items).toEqual(["c", "b", "a"])
		expect(reorder.rows.map((row) => row.key)).toEqual([2, 1, 0])
	})

	test("a drop returns the new order to save, and a drop on its own row returns none", () => {
		const reorder = new Reorder<string>(["a", "b", "c"])
		const event = { preventDefault() {}, dataTransfer: null } as unknown as DragEvent
		reorder.start(event, 0)
		reorder.hover(event, 2)
		expect(reorder.over).toBe(2)
		expect(reorder.drop(event, 2)).toEqual(["b", "c", "a"])
		reorder.start(event, 1)
		expect(reorder.drop(event, 1)).toBeNull()
	})

	test("focus goes back to the pressed button on the row that moved, so a keyboard presses it again", () => {
		const focused: string[] = []
		const button = (disabled: boolean, name: string) =>
			({ disabled, focus: () => focused.push(name) }) as unknown as HTMLButtonElement
		keepFocus(button(false, "down"), button(false, "up"))
		expect(focused).toEqual(["down"])
	})

	test("focus goes to the row's other button when the pressed one turned off at the edge", () => {
		const focused: string[] = []
		const button = (disabled: boolean, name: string) =>
			({ disabled, focus: () => focused.push(name) }) as unknown as HTMLButtonElement
		keepFocus(button(true, "up"), button(false, "down"))
		expect(focused).toEqual(["down"])
	})
})
