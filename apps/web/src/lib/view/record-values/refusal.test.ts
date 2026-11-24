import { describe, expect, test } from "bun:test"
import { refusalProblems } from "./refusal"

const base = { exitCode: 3, message: "The values were rejected and nothing was written." }

describe("a refusal", () => {
	test("lands on the row its details.values[n].index names, without traj's path prefix", () => {
		const error = {
			...base,
			code: "valuation_value_negative",
			details: {
				values: [
					{
						index: 1,
						reason: {
							message:
								'document.values.1.value: "Car Loan" is a liability, so its value is what it still owes, not -5',
							hint: "State what the liability still owes as a positive amount, such as 800.00.",
						},
					},
				],
			},
		}
		const problems = refusalProblems(error, ["bank", "debt"])
		expect(Object.keys(problems.rows)).toEqual(["debt"])
		const [message] = Object.values(problems.rows)
		expect(message).toStartWith('"Car Loan" is a liability')
		expect(message).toContain("positive amount")
		expect(problems.general).toBeUndefined()
	})

	test("names every refused row, each by its own index", () => {
		const reason = (message: string) => ({ message })
		const error = {
			...base,
			code: "invalid_input",
			details: {
				values: [
					{ index: 0, reason: reason("document.values.0.value: bad one") },
					{ index: 2, reason: reason("document.values.2.value: bad two") },
				],
			},
		}
		expect(refusalProblems(error, ["a", "b", "c"]).rows).toEqual({ a: "bad one", c: "bad two" })
	})

	test("a refused account to count against stays on that field, and nothing else is marked", () => {
		const error = {
			code: "valuation_against_invalid",
			exitCode: 3,
			message: 'document.against: "Bank" is asset, not an income or equity account',
		}
		expect(refusalProblems(error, ["bank"])).toEqual({
			rows: {},
			against: '"Bank" is asset, not an income or equity account',
		})
	})

	test("anything else is a message on the sheet, and no error is none", () => {
		const error = { code: "database_busy", exitCode: 5, message: "The ledger is busy." }
		expect(refusalProblems(error, ["a"])).toEqual({ rows: {}, general: "The ledger is busy." })
		expect(refusalProblems(null, [])).toEqual({ rows: {} })
	})
})
