import { describe, expect, test } from "bun:test"
import { projectionView } from "./projection"
import { annualRow, projectionRun } from "./projection-fixtures.test-support"

describe("projectionView", () => {
	test("takes the closing net worth of the last annual row, nominal and real", () => {
		const view = projectionView(
			projectionRun({
				annual: [
					annualRow("2027-10-30", "100.00", "90.00"),
					annualRow("2028-10-30", "200.00", "150.00"),
				],
			}),
		)
		expect(view).toEqual({
			currency: "THB",
			endDate: "30 Oct 2028",
			nominal: "200.00",
			real: "150.00",
			runsOut: null,
			horizonYear: "2060",
		})
	})

	test("states when the run runs out, the date and the unmet amount", () => {
		const view = projectionView(
			projectionRun({
				annual: [annualRow("2027-10-30", "1.00", "1.00")],
				runsOut: { date: "2056-05-01", unmet: "70359.24" },
			}),
		)
		expect(view?.runsOut).toEqual({ date: "1 May 2056", unmet: "70359.24" })
	})

	test("is null when the run holds no annual rows", () => {
		expect(projectionView(projectionRun({ annual: [] }))).toBeNull()
	})
})
