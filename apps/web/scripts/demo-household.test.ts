import { describe, expect, test } from "bun:test"
import { DEMO_HOUSEHOLD } from "./demo/scenario"
import { DEMO_SEPARATE_HOUSEHOLD } from "./demo/separate"
import { DEMO_INPUT } from "./demo-run"

const person = (id: string) => DEMO_HOUSEHOLD.people.find((one) => one.id === id)

describe("the Demo household", () => {
	test("states the same birth month as the Demo's birth date for the account holder", () => {
		expect(person("me")?.born).toBe(DEMO_INPUT.birthDate?.slice(0, 7))
	})

	test("holds no one born after the As-of", () => {
		const month = String(DEMO_INPUT.asOf).slice(0, 7)
		for (const one of DEMO_HOUSEHOLD.people) expect(one.born <= month).toBe(true)
	})

	test("the separate plan keeps the same people and gives each salary an Owner", () => {
		expect(DEMO_SEPARATE_HOUSEHOLD.schemaVersion).toBe(2)
		expect(DEMO_SEPARATE_HOUSEHOLD.people).toEqual(DEMO_HOUSEHOLD.people)
		expect(DEMO_SEPARATE_HOUSEHOLD.owners).toEqual([
			{ path: "flows.salary", person: "me" },
			{ path: "flows.partner-salary", person: "partner" },
		])
	})
})
