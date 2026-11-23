import { describe, expect, it } from "bun:test"
import {
	applyScenario,
	errorOf,
	resultOf,
	rowOf,
	scenario,
	scenarioHome,
} from "./scenario-test-support"
import { SCENARIO_DOCUMENT } from "./store/testing"
import { capture } from "./test-support"
import { ledgerHome } from "./tx-test-support"

type Doc = Record<string, unknown>

/** The fixture plus one expense Flow, which is the Flow a category belongs to (index 2). */
function withExpense(category: unknown): Doc {
	const groceries = {
		id: "groceries",
		kind: "expense",
		amount: 20_000,
		frequency: "monthly",
		start: "2026-01-01",
		growth: "inflation",
		category,
	}
	return { ...SCENARIO_DOCUMENT, flows: [...SCENARIO_DOCUMENT.flows, groceries] }
}

describe("the expense category in traj schema scenario apply", () => {
	it("publishes category on a Flow as a 1 to 64 character string", async () => {
		const res = await capture(["schema", "scenario", "apply", "--json"], {
			TRAJ_HOME: ledgerHome(),
		})
		expect(res.code).toBe(0)
		const { document } = JSON.parse(res.out) as {
			document: { schema: { properties: { flows: { items: { properties: Doc } } } } }
		}
		expect(document.schema.properties.flows.items.properties["category"]).toMatchObject({
			type: "string",
			minLength: 1,
			maxLength: 64,
		})
	})
})

describe("the expense category in scenario apply and show", () => {
	it("round-trips a document with categories unchanged through --decimal", async () => {
		const home = scenarioHome()
		await applyScenario(home, "base", withExpense("essentials"))
		const before = rowOf(resultOf(await scenario(home, ["show", "base"])))
		const printed = rowOf(resultOf(await scenario(home, ["show", "base", "--decimal"])))
		const flows = printed.document["flows"] as Doc[]
		expect(flows[2]?.["category"]).toBe("essentials")
		const res = await applyScenario(home, "base", printed.document, ["--decimal"])
		expect(res.code).toBe(0)
		expect(resultOf(res).status).toBe("unchanged")
		const after = rowOf(resultOf(await scenario(home, ["show", "base"])))
		expect(after.contentHash).toBe(before.contentHash)
	})

	it("refuses a category longer than 64 characters as INVALID_CATEGORY at its document path", async () => {
		const res = await applyScenario(scenarioHome(), "base", withExpense("a".repeat(65)))
		expect(res.code).toBe(2)
		expect(errorOf(res)).toMatchObject({
			code: "invalid_input",
			path: "document.flows.2.category",
		})
		expect(errorOf(res).details).toEqual([
			{
				path: "document.flows.2.category",
				message: "document.flows.2.category: INVALID_CATEGORY",
				code: "INVALID_CATEGORY",
			},
		])
	})
})
