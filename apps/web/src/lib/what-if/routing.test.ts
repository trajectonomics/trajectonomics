import { describe, expect, test } from "bun:test"
import type { ScenarioDocument } from "../contract"
import { shownPlan } from "./routing"
import { startWhatIf, withAddition, withGroupOff } from "./session"

const DOC = {
	currency: "THB",
	flows: [
		{ id: "salary", kind: "income", amount: "50000.00", frequency: "monthly", start: "2026-01-01" },
		{
			id: "transfer",
			kind: "transfer",
			amount: "1000.00",
			frequency: "monthly",
			start: "2026-01-01",
		},
	],
	accounts: [],
} as unknown as ScenarioDocument

const SALARY = {
	kind: "salary" as const,
	name: "salary",
	paths: ["flows.salary", "flows.salary-employer"],
}

const SHARE = {
	id: "salary-employer",
	kind: "contribution",
	target: "fund",
	funding: "employer",
	frequency: "monthly",
	start: "2026-01-01",
}

const BONUS = {
	id: "bonus",
	kind: "expense",
	amount: "1000.00",
	frequency: "monthly",
	start: "2026-01-01",
}

const ids = (whatIf: Parameters<typeof shownPlan>[1]) =>
	shownPlan(DOC, whatIf).flows.map((flow) => flow.id)

describe("the plan a What-if session shows", () => {
	test("an added Flow comes after the plan's own, as the session sends it", () => {
		const added = withAddition(startWhatIf("base", "hash"), { list: "flows", item: BONUS })
		expect(ids(added)).toEqual(["salary", "transfer", "bonus"])
	})

	test("an added Flow a Removal holds is left out, so a refusal by position names the row traj sees", () => {
		const added = withAddition(startWhatIf("base", "hash"), { list: "flows", item: SHARE })
		const off = withGroupOff(added, SALARY, SALARY.paths)
		const next = withAddition(off, { list: "flows", item: BONUS })
		expect(ids(next)).toEqual(["transfer", "bonus"])
	})
})
