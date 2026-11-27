import { describe, expect, it } from "bun:test"
import { allowedValues } from "@trajectonomics/core/sim"
import { ASSUMED_KINDS } from "./scenario/assumed/shape"
import { capture } from "./test-support"
import { ledgerHome } from "./tx-test-support"

type Node = {
	enum?: string[]
	const?: string
	description?: string
	properties?: Record<string, Node>
	items?: Node
	oneOf?: Node[]
}

/** The Scenario document `traj schema scenario apply --json` publishes under `document`. */
async function documentSchema(): Promise<Node> {
	const res = await capture(["schema", "scenario", "apply", "--json"], { TRAJ_HOME: ledgerHome() })
	expect(res.code).toBe(0)
	return (JSON.parse(res.out) as { document: { schema: Node } }).document.schema
}

/** The result schema `traj schema scenario show --json` publishes. */
async function showSchema(): Promise<Node> {
	const res = await capture(["schema", "scenario", "show", "--json"], { TRAJ_HOME: ledgerHome() })
	expect(res.code).toBe(0)
	return (JSON.parse(res.out) as { output: Node }).output
}

describe("the Scenario document in traj schema scenario apply", () => {
	it("lists a Measure's rounding values, the ones the engine refuses a mistake with", async () => {
		const schema = await documentSchema()
		const measure =
			schema.properties?.["flows"]?.items?.properties?.["derive"]?.properties?.["measures"]?.items
		const rounding = measure?.properties?.["rounding"]
		expect(rounding?.enum).toEqual([...(allowedValues("INVALID_ROUNDING", []) ?? [])])
		expect(rounding?.enum).toEqual(["floor", "halfUp", "ceil"])
		expect(rounding?.description).toContain("halfEven")
	})

	it("says a derived expense cannot read an earned Flow", async () => {
		const schema = await documentSchema()
		const derive = schema.properties?.["flows"]?.items?.properties?.["derive"]
		expect(derive?.description).toContain("cannot read an earned income Flow")
		expect(derive?.description).toContain("DERIVED_EXPENSE_READS_EARNED")
	})
})

describe("the Assumed values traj schema scenario show publishes", () => {
	it("lists exactly the kinds this build produces, in the fixed order", async () => {
		const schema = await showSchema()
		const assumed = schema.properties?.["scenario"]?.properties?.["assumed"]
		const kinds = (assumed?.items?.oneOf ?? []).map((branch) => branch.properties?.["kind"]?.const)
		expect(kinds).toEqual([...ASSUMED_KINDS])
	})
})
