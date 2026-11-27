import { describe, expect, test } from "bun:test"
import { planChoices } from "./choices"

describe("the plan switcher's rows", () => {
	const names = ["base", "retire-early"]
	const asked: string[] = []
	const choices = planChoices(names, "retire-early", (name) => asked.push(name))

	test("keeps the Snapshot's order and marks the plan the pages show", () => {
		expect(choices.map((choice) => choice.name)).toEqual(names)
		expect(choices.filter((choice) => choice.selected).map((choice) => choice.name)).toEqual([
			"retire-early",
		])
	})

	test("asks the page to show the plan whose row is chosen", () => {
		asked.length = 0
		choices[0]?.choose()
		expect(asked).toEqual(["base"])
	})
})
