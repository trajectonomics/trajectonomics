import { describe, expect, test } from "bun:test"
import type { ProjectionRun } from "../../contract"
import { baselineRun } from "./baseline"
import { DEMO, demoLens } from "./fixtures.test-support"
import { overviewExtras } from "./overview"

const withFees = (run: ProjectionRun | null, fees?: string): ProjectionRun | null =>
	run === null
		? null
		: ({ ...run, ...(fees === undefined ? {} : { lifetimeFees: fees }) } as ProjectionRun)

describe("the Overview's what-if states the fees over the plan", () => {
	test("shows the what-if's figure beside the baseline's, and states no change", () => {
		const lens = { ...demoLens(), run: withFees(demoLens().run, "1520.00") }
		const baseline = withFees(baselineRun(DEMO, "base"), "1514.01")
		const fees = overviewExtras(lens, null, baseline).fees
		expect(fees?.label).toBe("Fees over the plan")
		expect(fees?.whatIf.value).toEqual({ kind: "money", amount: "1520.00" })
		expect(fees?.baseline.value).toEqual({ kind: "money", amount: "1514.01" })
		expect(fees?.change.kind).toBe("none")
	})

	test("names a baseline that charged none", () => {
		const tried = { ...demoLens(), run: withFees(demoLens().run, "12.00") }
		expect(overviewExtras(tried, null, baselineRun(DEMO, "base")).fees?.baseline.value).toEqual({
			kind: "text",
			text: "None",
		})
	})

	test("a fee in the baseline and none in the tried run shows 'None' on the what-if side", () => {
		const lens = { ...demoLens(), run: withFees(demoLens().run, undefined) }
		const baseline = withFees(baselineRun(DEMO, "base"), "5.00")
		const fees = overviewExtras(lens, null, baseline).fees
		expect(fees?.label).toBe("Fees over the plan")
		expect(fees?.whatIf.value).toEqual({ kind: "text", text: "None" })
		expect(fees?.baseline.value).toEqual({ kind: "money", amount: "5.00" })
		expect(fees?.change.kind).toBe("none")
	})

	test("no fee in the baseline and one in the tried run shows 'None' on the baseline side", () => {
		const lens = { ...demoLens(), run: withFees(demoLens().run, "7.00") }
		const baseline = withFees(baselineRun(DEMO, "base"), undefined)
		const fees = overviewExtras(lens, null, baseline).fees
		expect(fees?.whatIf.value).toEqual({ kind: "money", amount: "7.00" })
		expect(fees?.baseline.value).toEqual({ kind: "text", text: "None" })
	})

	test("neither side states a fee: no row", () => {
		const lens = { ...demoLens(), run: withFees(demoLens().run, undefined) }
		const baseline = withFees(baselineRun(DEMO, "base"), undefined)
		expect(overviewExtras(lens, null, baseline).fees).toBeNull()
	})
})
