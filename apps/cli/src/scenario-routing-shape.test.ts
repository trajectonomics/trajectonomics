// The shape `traj schema` publishes for `cashflow` stays the plain one while the CLI refuses the routing keys.
import { describe, expect, it } from "bun:test"
import { unshippedRouting, unshippedRoutingAt } from "./scenario/routing-unshipped"
import { CASES, type Doc, withCashflow } from "./scenario-routing-support"
import { scenarioHome } from "./scenario-test-support"
import { SCENARIO_DOCUMENT } from "./store/testing"
import { capture } from "./test-support"

describe("traj schema, with a routing key that ships in a later release", () => {
	it("describes the cashflow shape as it did: plain ids, a whole-amount upTo, no share or floor", async () => {
		const res = await capture(["schema", "scenario", "apply", "--json"], {
			TRAJ_HOME: scenarioHome(),
		})
		expect(res.code).toBe(0)
		const cashflow = (
			JSON.parse(res.out) as {
				document: { schema: { properties: { cashflow: Doc } } }
			}
		).document.schema.properties.cashflow as {
			properties: {
				surplus: { items: { properties: Doc } }
				withdraw: { items: { type: string } }
			}
		}
		expect(cashflow.properties.withdraw.items.type).toBe("string")
		expect(Object.keys(cashflow.properties.surplus.items.properties)).toEqual(["account", "upTo"])
		expect((cashflow.properties.surplus.items.properties["upTo"] as Doc)["type"]).toBe("integer")
		expect(res.out).not.toContain("downTo")
	})
})

describe("unshippedRouting", () => {
	it("finds nothing in a plain document, a non-object or a document without cashflow", () => {
		expect(unshippedRouting(SCENARIO_DOCUMENT)).toEqual([])
		expect(unshippedRouting(null)).toEqual([])
		expect(unshippedRouting([])).toEqual([])
		expect(unshippedRouting({ cashflow: { surplus: "x", withdraw: 3 } })).toEqual([])
	})

	it("reads a value at the path a Set names", () => {
		expect(unshippedRoutingAt(["cashflow", "withdraw"], ["cash"])).toEqual([])
		expect(unshippedRoutingAt(["flows", "salary", "amount"], { share: 1 })).toEqual([])
		expect(unshippedRoutingAt(["cashflow", "withdraw"], [{ account: "cash" }])).toHaveLength(1)
		expect(unshippedRoutingAt(["cashflow", "surplus"], [{ account: "cash", share: 1 }])).toEqual([
			expect.objectContaining({ segments: ["cashflow", "surplus", 0, "share"] }),
		])
		expect(unshippedRoutingAt(["cashflow"], CASES[2]?.cashflow)).toHaveLength(1)
		expect(unshippedRoutingAt([], withCashflow(CASES[0]?.cashflow))).toHaveLength(1)
	})
})
