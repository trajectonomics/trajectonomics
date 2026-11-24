import { describe, expect, test } from "bun:test"
import { changedIds, chosenAgainst, effectiveDate, recordValuesOf, type SheetDraft } from "./draft"
import { sheetSnapshot } from "./fixtures.test-support"
import { valueSheet } from "./sheet"
import type { ValueSheet } from "./types"

const sheet = valueSheet(sheetSnapshot()) as ValueSheet
const draft = (over: Partial<SheetDraft> = {}): SheetDraft => ({
	date: "",
	against: "gains",
	values: {},
	...over,
})

describe("the rows an Edit sends", () => {
	test("are the rows with a value, in the sheet's order; a row left empty is not sent", () => {
		const typed = draft({ values: { fund: "9100", bank: "1600.50", home: "", debt: "  " } })
		expect(changedIds(typed, sheet)).toEqual(["bank", "fund"])
		const built = recordValuesOf(typed, sheet)
		expect(built).toMatchObject({ ok: true, sent: ["bank", "fund"] })
		if (built.ok) {
			expect(built.edit).toEqual({
				kind: "record-values",
				against: "gains",
				values: [
					{ account: "bank", date: "2026-10-31", value: "1600.50" },
					{ account: "fund", date: "2026-10-31", value: "9100" },
				],
			})
		}
	})

	test("send each value as typed, with only the spaces around it taken off", () => {
		const built = recordValuesOf(draft({ values: { bank: " 1,600.5 " } }), sheet)
		expect(built.ok && built.edit.kind === "record-values" && built.edit.values[0]?.value).toBe(
			"1,600.5",
		)
	})

	test("state the date typed, and the Snapshot's As-of when none is", () => {
		expect(effectiveDate(draft(), sheet)).toBe("2026-10-31")
		const built = recordValuesOf(draft({ date: "2026-10-01", values: { bank: "1" } }), sheet)
		expect(built.ok && built.edit.kind === "record-values" && built.edit.values[0]?.date).toBe(
			"2026-10-01",
		)
	})
})

describe("a draft that cannot be sent", () => {
	test("says so at the field: no value, no account to count against, a date that does not exist", () => {
		const none = recordValuesOf(draft(), sheet)
		expect(none.ok || none.problems.general).toBe("Type a value for at least one account.")
		const unchosen = recordValuesOf(draft({ against: "", values: { bank: "1" } }), sheet)
		expect(unchosen.ok || unchosen.problems.against).toContain("Choose the account")
		const badDate = recordValuesOf(draft({ date: "2026-02-30", values: { bank: "1" } }), sheet)
		expect(badDate.ok || badDate.problems.date).toContain("2026-10-31")
	})

	test("reads a remembered account that the ledger no longer offers as none", () => {
		expect(chosenAgainst(draft({ against: "gone" }), sheet)).toBeNull()
		expect(chosenAgainst(draft({ against: "equity" }), sheet)?.name).toBe("Opening equity")
		expect(recordValuesOf(draft({ against: "old-gains", values: { bank: "1" } }), sheet).ok).toBe(
			false,
		)
	})
})
