import { describe, expect, test } from "bun:test"
import { accountValues } from "../../contract"
import { sheetSnapshot } from "./fixtures.test-support"
import { savedView } from "./saved"
import { valueSheet } from "./sheet"
import type { ValueSheet } from "./types"
import { choiceLabel, footerLine, lastLine, OWED_HINT } from "./words"

const GOLDEN = new URL(
	"../../../../../cli/src/account/value/fixtures/values.output",
	import.meta.url,
)
const sheet = valueSheet(sheetSnapshot()) as ValueSheet

describe("the saved rows", () => {
	test("are the CLI's own before, value and difference, in the order it applied them", async () => {
		const result = accountValues.parse(JSON.parse(await Bun.file(GOLDEN).text()))
		const view = savedView(result, sheet)
		expect(view.rows.map((row) => row.key)).toEqual(result.values.map((row) => `${row.index}`))
		result.values.forEach((entry, at) => {
			expect(view.rows[at]).toMatchObject({
				name: entry.account.name,
				before: entry.before,
				value: entry.value,
				difference: entry.difference,
				written: entry.status === "added",
			})
		})
		expect(view.summary).toBe("2 recorded, 1 already at that value, nothing written.")
	})
})

describe("a debt's saved row", () => {
	const entry = (id: string, name: string) => ({
		index: 0,
		status: "added",
		account: { id, name },
		date: "2026-10-31",
		before: "1500000.00",
		value: "1480000.00",
		difference: "-20000.00",
		transaction: null,
		notes: [],
	})
	const result = (id: string, name: string) =>
		accountValues.parse({
			dryRun: false,
			file: "-",
			against: { id: "gains", name: "Gains" },
			values: [entry(id, name)],
			counts: { added: 1, unchanged: 0 },
		})

	test("is marked as owed, with the CLI's difference untouched; an asset's row is not", () => {
		const debt = savedView(result("debt", "Car Loan"), sheet).rows[0]
		expect(debt).toMatchObject({ owed: true, difference: "-20000.00" })
		expect(savedView(result("bank", "Bank"), sheet).rows[0]?.owed).toBe(false)
	})
})

describe("the sheet's words", () => {
	const row = { id: "x", name: "X", currency: "THB", balance: null, owed: false }

	test("a last date is the day of the last Transaction, or says from when none was loaded", () => {
		expect(lastLine({ ...row, lastDate: "2026-10-30" }, "2026-08-01")).toBe(
			"Last transaction 30 Oct 2026",
		)
		expect(lastLine({ ...row, lastDate: null }, "2026-08-01")).toBe(
			"No transaction since 1 Aug 2026",
		)
		expect(lastLine({ ...row, lastDate: null }, null)).toBe("No transaction loaded")
	})

	test("the footer names the account the differences count against and how many rows changed", () => {
		const against = { id: "g", name: "Gains", currency: "THB" }
		expect(footerLine(2, against)).toBe("2 accounts changed. Differences count against Gains.")
		expect(footerLine(1, null)).toContain("Choose an account")
		expect(choiceLabel(against)).toBe("Gains (THB)")
		expect(OWED_HINT).toContain("positive number")
	})
})
