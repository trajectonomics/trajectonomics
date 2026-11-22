import { describe, expect, it } from "bun:test"
import { scenarioHome } from "./scenario-test-support"
import { capture } from "./test-support"

type Doc = Record<string, unknown>

/** The part of the decimal form's published schema these cases read. */
type Alternate = {
	properties: {
		flows: { items: { properties: { amount: { type: string; description: string } } } }
	}
}

describe("traj schema for the decimal form", () => {
	it("describes the alternate form beside the document, selected by --decimal", async () => {
		const res = await capture(["schema", "scenario", "apply", "--json"], {
			TRAJ_HOME: scenarioHome(),
		})
		expect(res.code).toBe(0)
		const detail = JSON.parse(res.out) as {
			document: { alternate: { flag: string; schema: Alternate } }
		}
		expect(detail.document.alternate.flag).toBe("decimal")
		const amount = detail.document.alternate.schema.properties.flows.items.properties.amount
		expect(amount.type).toBe("string")
		expect(amount.description).toContain('"350.00" is 35000 satang')
	})

	it("names the decimal flag on show, and the flag's meaning", async () => {
		const res = await capture(["schema", "scenario", "show", "--json"], {
			TRAJ_HOME: scenarioHome(),
		})
		const detail = JSON.parse(res.out) as { input: { properties: Doc } }
		const flag = detail.input.properties["decimal"] as { type: string; description: string }
		expect(flag.type).toBe("boolean")
		expect(flag.description).toContain("decimal strings")
	})
})
