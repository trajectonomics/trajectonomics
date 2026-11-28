// `--set` may begin `label` only on an income or contribution Flow (cli ADR-0083).
import { describe, expect, it } from "bun:test"
import { taxedHome } from "./scenario-tax-profile-support"
import { applyScenario, errorOf, resultOf, scenario } from "./scenario-test-support"

type PlanDocument = { flows: Record<string, unknown>[] }

/** The plan's stored document. */
async function documentOf(home: string): Promise<PlanDocument> {
	const res = await scenario(home, ["show", "base"])
	expect(res.code).toBe(0)
	return resultOf(res).scenario.document as PlanDocument
}

/** `traj scenario apply base --set flows.<id>.label=<json>`. */
function setLabel(home: string, id: string, label: string) {
	return scenario(home, ["apply", "base", "--set", `flows.${id}.label=${JSON.stringify(label)}`])
}

describe("the label a --set may begin", () => {
	it("begins on an income Flow", async () => {
		const home = await taxedHome()
		const document = await documentOf(home)
		const flows = document.flows.map((flow) => {
			if (flow["id"] !== "salary") return flow
			const { label: _label, ...unlabelled } = flow
			return unlabelled
		})
		expect((await applyScenario(home, "base", { ...document, flows })).code).toBe(0)
		expect((await setLabel(home, "salary", "income.section40_1")).code).toBe(0)
		const salary = (await documentOf(home)).flows.find((flow) => flow["id"] === "salary")
		expect(salary?.["label"]).toBe("income.section40_1")
	})

	it("begins on a contribution Flow", async () => {
		const home = await taxedHome()
		expect((await setLabel(home, "invest", "allowance.retirement.pvd")).code).toBe(0)
		const invest = (await documentOf(home)).flows.find((flow) => flow["id"] === "invest")
		expect(invest?.["label"]).toBe("allowance.retirement.pvd")
	})

	it("is refused on an expense Flow", async () => {
		const home = await taxedHome()
		const res = await setLabel(home, "rent", "income.section40_1")
		expect(res.code).toBe(2)
		expect(errorOf(res).message).toContain('No key or id "label"')
	})
})
