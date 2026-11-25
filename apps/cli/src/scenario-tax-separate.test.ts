import { describe, expect, it } from "bun:test"
import {
	COUPLE_OWNERS,
	COUPLE_PLAN,
	couple,
	coupleHousehold,
	taxCouple,
} from "./scenario-tax-filers-support"
import { documentOf, flowOf, LABELS } from "./scenario-tax-separate-support"
import { errorOf, resultOf, scenario } from "./scenario-test-support"

/* The separate Return (cli ADR-0075): one Levy per Filer, each Flow labelled for its Owner. */

describe("scenario tax, a separate Return", () => {
	it("writes one Levy per Filer and gives each Flow its Owner's Filer label", async () => {
		const home = await couple(COUPLE_PLAN, coupleHousehold(COUPLE_OWNERS))
		const res = await taxCouple(home, "married_separate")
		expect(res.code, res.err).toBe(0)
		expect(resultOf(res)).toMatchObject({
			filers: ["me", "partner"],
			levies: ["th-2026-pit@me", "th-2026-pit@partner"],
		})
		const document = await documentOf(home)
		expect((document["levies"] as { id: string }[]).map((levy) => levy.id)).toEqual([
			"th-2026-pit@me",
			"th-2026-pit@partner",
		])
		expect(flowOf(document, "salary")["label"]).toBe("income.section40_1@me")
		expect(flowOf(document, "partner-salary")["label"]).toBe("income.section40_1@partner")
		expect(flowOf(document, "pvd")["label"]).toBe("allowance.retirement.pvd@partner")
	})

	it("gives each Return its children and deductions, and --merge and --from-stored keep them", async () => {
		const home = await couple(COUPLE_PLAN, coupleHousehold(COUPLE_OWNERS))
		const extra = ["--children", "1", "--parents", "partner=2"]
		expect((await taxCouple(home, "married_separate", LABELS, extra)).code).toBe(0)
		const stored = resultOf(await scenario(home, ["show", "base"])).scenario.tax
		expect(stored).toMatchObject({
			filingStatus: "married_separate",
			children: 1,
			returns: {
				me: { children: 1, childrenAtHigherRate: 0 },
				partner: { children: 0, childrenAtHigherRate: 0, parents: 2 },
			},
		})
		expect((await scenario(home, ["tax", "base", "--merge", "--children", "partner=1"])).code).toBe(
			0,
		)
		expect(resultOf(await scenario(home, ["show", "base"])).scenario.tax).toMatchObject({
			returns: { me: { children: 1 }, partner: { children: 1, parents: 2 } },
		})
		const again = await scenario(home, ["tax", "base", "--from-stored"])
		expect(again.code, again.err).toBe(0)
		expect(resultOf(again)).toMatchObject({ status: "unchanged" })
	})

	it("refuses a person-qualified value without a separate Return, naming the flag", async () => {
		const home = await couple(COUPLE_PLAN, coupleHousehold(COUPLE_OWNERS))
		const res = await taxCouple(home, "single", LABELS, ["--parents", "partner=2"])
		expect(res.code).toBe(2)
		expect(errorOf(res)).toMatchObject({ code: "invalid_input", path: "--parents" })
	})

	it("refuses it too when the household has a partner but no Owners", async () => {
		const home = await couple(COUPLE_PLAN, coupleHousehold([]))
		const res = await taxCouple(home, "married_separate", LABELS, ["--parents", "partner=2"])
		expect(res.code).toBe(2)
		expect(errorOf(res)).toMatchObject({ code: "invalid_input", path: "--parents" })
	})
})
