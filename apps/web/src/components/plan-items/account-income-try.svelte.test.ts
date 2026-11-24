import { describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { whatIfSession } from "../../client/what-if.svelte.js"
import { HASH, useSessionHooks } from "../../client/what-if.test-support"
import { scenarioDocument } from "../../lib/contract"
import { baselineRead, planDocument } from "../../lib/view/plan-items/fixtures.test-support"
import { recordOf } from "../../lib/what-if/session"
import PlanItemDrawer from "./PlanItemDrawer.svelte"

useSessionHooks()

const FUND = { id: "fund", kind: "asset", rate: 600, fee: { bps: "1.50", rounding: "halfUp" } }
const EMPLOYER = {
	id: "salary-employer",
	kind: "contribution",
	target: "fund",
	funding: "employer",
	frequency: "monthly",
	start: "2026-11-01",
	derive: {
		measures: [
			{ id: "pay", op: "flow", flow: "salary" },
			{ id: "share", op: "scale", of: "pay", num: 500, den: 10000, rounding: "floor" },
		],
		result: "share",
	},
}
const base = planDocument()
const doc = scenarioDocument.parse({
	...base,
	accounts: [...base.accounts, FUND],
	flows: [...base.flows, EMPLOYER],
})

/** The drawer that tries a value on the item, over the plan the session belongs to. */
function trying(id: string, kind: "income" | "assets"): string {
	return render(PlanItemDrawer, {
		props: {
			drawer: { id, tryValue: true },
			kind,
			name: "base",
			doc,
			household: null,
			baseline: baselineRead(),
			contentHash: HASH,
			onClose: () => {},
		},
	}).body
}

describe("a drawer that tries a value starts from what the session shows", () => {
	test("the account form shows the rate already tried, so trying the fee keeps it", () => {
		const fund = doc.accounts.find((one) => one.id === "fund")
		if (fund === undefined) throw new Error("no fund")
		whatIfSession.tryAccount("base", HASH, {
			stored: recordOf(fund),
			edited: { ...recordOf(fund), id: "fund", rate: 700 },
		})
		const body = trying("fund", "assets")
		expect(body).toContain('value="7.00"')
		expect(body).not.toContain('value="6.00"')
	})

	test("the salary form shows the employer share already tried, so trying the amount keeps it", () => {
		const employer = doc.flows.find((one) => one.id === "salary-employer")
		if (employer === undefined) throw new Error("no employer flow")
		whatIfSession.tryFlow("base", HASH, {
			stored: recordOf(employer),
			edited: {
				...recordOf(employer),
				id: "salary-employer",
				derive: {
					measures: [
						{ id: "pay", op: "flow", flow: "salary" },
						{ id: "share", op: "scale", of: "pay", num: 700, den: 10000, rounding: "floor" },
					],
					result: "share",
				},
			},
		})
		expect(trying("salary", "income")).toContain('id="employer-share"')
		expect(trying("salary", "income")).toMatch(/id="employer-share"[^>]*value="7.00"/)
	})
})
