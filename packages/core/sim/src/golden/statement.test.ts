import { describe, expect, it } from "bun:test"
import { project } from "../engine/project"
import { levelLoanMonth } from "./loan-cases"
import { oraclePayment } from "./oracle-loan"
import {
	engineTable,
	identityHolds,
	LEVEL_PAYMENT,
	MONTH_ENDS,
	OPTION,
	onDays,
	oracleOf,
	oracleTable,
	statementOf,
} from "./statement-helpers"

const lands = onDays(MONTH_ENDS, LEVEL_PAYMENT)

describe("the level loan of #276", () => {
	const statement = statementOf(levelLoanMonth)

	it("its level payment under ceil is 860,665", () => {
		expect(oraclePayment(10_000_000n, 600n, 12, "ceil")).toBe(LEVEL_PAYMENT)
	})

	// 10,000,000 × 600 × 31 / (120,000 × 31) = 50,000: a full month at 0.5%. Closing is 10,000,000 +
	// 50,000 − 860,665 = 9,189,335.
	it("shows 500.00 of interest and 9,189,335 owed after the first payment", () => {
		expect(statement.months[1]).toEqual({
			from: "2026-01-01",
			to: "2026-01-31",
			opening: 10_000_000,
			drawn: 0,
			paid: 860_665,
			interest: 50_000,
			closing: 9_189_335,
			partial: false,
		})
	})

	it("is paid off on 31 December, the twelfth month end, and matches the oracle", () => {
		expect(statement.paidOff).toBe("2026-12-31")
		expect(identityHolds(statement)).toBe(true)
		expect(engineTable(statement)).toEqual(
			oracleTable(oracleOf(levelLoanMonth, { planned: lands }, "2026-12-31")),
		)
	})

	it("the option is opt-in: without it there is no liabilities key, and nothing else moves", () => {
		const plain = project(levelLoanMonth.baseline, levelLoanMonth.scenario, levelLoanMonth.timeline)
		const withOption = project(
			levelLoanMonth.baseline,
			levelLoanMonth.scenario,
			levelLoanMonth.timeline,
			OPTION,
		)
		if (!plain.ok || !withOption.ok) throw new Error("projection failed")
		expect("liabilities" in plain.projection).toBe(false)
		const { liabilities, ...rest } = withOption.projection
		expect(liabilities).toHaveLength(1)
		expect(rest).toEqual(plain.projection)
	})
})
