import { describe, expect, test } from "bun:test"
import { isWarningNote } from "./warning-notes"

const SUCCESS_NOTE =
	"The plan holds to 2043-12-31 on 174 of 200 seeded Market paths: a success share of 87.00%."

describe("isWarningNote", () => {
	test("counts the unfunded, unmet and tax notes, and no others", () => {
		const notes = [
			"29603.80 of Contributions could not be funded, so they were not made. Contribution cap: use a monthly Flow.",
			"The Scenario had 125000.00 unmet on 2027-03-31. Anything the day's income cannot cover is paid only from the Accounts in cashflow.withdraw.",
			"No tax is applied; figures are before tax.",
			'Tax is applied: Thailand 2026 personal income tax, from the Scenario\'s Levy "th-2026-pit".',
			"FI is not reachable, so taxYears describes the plan as written, with earned income as the plan states it.",
		]
		expect(notes.filter(isWarningNote)).toEqual(notes.slice(0, 3))
	})

	test("recognises the exact sentences the CLI's note builders state", () => {
		const stated = [
			"29603.80 of Contributions could not be funded, so they were not made. Contribution cap: use a monthly Flow.",
			"Side B could not fund 125000.00 of Contributions, so they were not made. Contribution cap: use a monthly Flow.",
			"The Scenario had 125000.00 unmet on 2027-03-31. Anything the day's income cannot cover is paid only from the Accounts in cashflow.withdraw, and this asset Account was not in it, holding on that day: bank (125000.00). If the Scenario may draw on it, add it to cashflow.withdraw, for example --set 'cashflow.withdraw=[\"bank\"]'.",
			"No tax is applied; figures are before tax.",
			"Tax before 2026 is not recomputed; any tax still owed belongs in the Ledger as a liability.",
		]
		expect(stated.filter(isWarningNote)).toEqual(stated)
	})

	test("leaves the carry-in note out: it is informational, not something to check", () => {
		expect(
			isWarningNote(
				"The 2026 tax year is charged on the Flows from 2026-10-31 plus the stated Carry-in, not the whole year.",
			),
		).toBe(false)
	})

	test("leaves the success note and an applied-tax note out of the count", () => {
		expect(isWarningNote(SUCCESS_NOTE)).toBe(false)
		expect(
			isWarningNote(
				'Tax is applied: Thailand 2026 personal income tax, from the Scenario\'s Levy "th-2026".',
			),
		).toBe(false)
	})
})
