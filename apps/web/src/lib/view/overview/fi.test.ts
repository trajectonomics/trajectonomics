import { describe, expect, test } from "bun:test"
import { fiView } from "./fi"
import { fi } from "./projection-fixtures.test-support"

describe("fiView", () => {
	test("reads a reachable FI date as its month and year", () => {
		const view = fiView(
			fi({
				reachable: true,
				fiDate: "2042-10-01",
				reference: {
					label: "ruleOfThumb",
					date: "2042-10-01",
					multiplier: 25,
					basis: "unlockedAssets",
					window: "next12Months",
					terms: "nominal",
					unlockedAssets: "1.00",
					numerator: "1.00",
					annualExpenses: "1.00",
					threshold: "1.00",
					multipleBps: null,
					partial: false,
					met: false,
				},
			}),
		)
		expect(view).toEqual({ reachable: true, month: "Oct 2042" })
	})

	test("names the horizon and what binds when FI is not reachable", () => {
		const view = fiView(
			fi({ reachable: false, binding: "insufficientMoney", bestCase: bestCase() }),
		)
		expect(view).toEqual({
			reachable: false,
			horizon: "31 Dec 2060",
			binding: "Even with every asset, the money does not cover the spending once work stops.",
		})
	})

	test("gives each binding its own words", () => {
		const shortfall = fiView(
			fi({ reachable: false, binding: "shortfallBeforeStop", bestCase: bestCase() }),
		)
		const buffer = fiView(fi({ reachable: false, binding: "minimumBuffer", bestCase: bestCase() }))
		const none = fiView(fi({ reachable: false, binding: "noCandidateMonth" }))
		expect(shortfall.reachable).toBe(false)
		expect(buffer.reachable).toBe(false)
		expect(none.reachable).toBe(false)
		const words = [shortfall, buffer, none].map((item) => (item.reachable ? "" : item.binding))
		expect(new Set(words).size).toBe(3)
	})
})

function bestCase() {
	return {
		month: "2040-06-01",
		runsOut: { date: "2056-05-01", unmet: "70359.24" },
	}
}
