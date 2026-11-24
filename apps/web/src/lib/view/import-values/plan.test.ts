import { describe, expect, test } from "bun:test"
import { previewAnswer } from "../../edit/answer"
import { editSchema } from "../../edit/edit"
import { RECORD_VALUES_MAX_ROWS } from "../../edit/record-values"
import { SKIP } from "./match"
import { parseImport } from "./parse"
import { importEdit, importPlan } from "./plan"
import { previewOf } from "./preview"
import { importRefusal } from "./refusals"
import { planLine, previewLine, refusedItems } from "./words"

const parsed = parseImport("Date,Bank,Fund,Old\n2026-02-28,2,20,9\n2026-01-31,1,10,8", "dates-down")
const plan = importPlan(parsed, { "0:Bank": "bank-id", "1:Fund": "fund-id", "2:Old": SKIP })

describe("the plan", () => {
	test("holds the matched values in date order, with their range, and none of a skipped account", () => {
		expect(plan.sent.map((entry) => `${entry.source}|${entry.date}`)).toEqual([
			"0:Bank|2026-01-31",
			"1:Fund|2026-01-31",
			"0:Bank|2026-02-28",
			"1:Fund|2026-02-28",
		])
		expect([plan.earliest, plan.latest, plan.tooMany]).toEqual(["2026-01-31", "2026-02-28", false])
		expect(planLine(plan.sent.length, plan.earliest, plan.latest)).toBe(
			"4 values, from 31 Jan 2026 to 28 Feb 2026",
		)
	})

	test("is one record-values Edit the schema takes, with the values as typed; a preview adds preview: true", () => {
		const edit = importEdit(plan, "gains-id", false)
		expect(editSchema.parse(edit)).toEqual({
			kind: "record-values",
			against: "gains-id",
			values: [
				{ account: "bank-id", date: "2026-01-31", value: "1" },
				{ account: "fund-id", date: "2026-01-31", value: "10" },
				{ account: "bank-id", date: "2026-02-28", value: "2" },
				{ account: "fund-id", date: "2026-02-28", value: "20" },
			],
		})
		expect(editSchema.parse(importEdit(plan, "gains-id", true))).toMatchObject({ preview: true })
	})

	test("says it is too many when more values are matched than one Edit may carry", () => {
		const rows = Array.from(
			{ length: RECORD_VALUES_MAX_ROWS + 1 },
			(_, at) => `2026-01-${String((at % 28) + 1).padStart(2, "0")},1`,
		)
		const many = parseImport(`Date,A\n${rows.join("\n")}`, "dates-down")
		expect(importPlan(many, { "0:A": "bank-id" }).tooMany).toBe(true)
	})
})

describe("what traj answers to the preview", () => {
	const answer = (body: unknown) => previewAnswer.parse(body)

	test("names a refused value by the row and column it came from, by its index in the batch sent", () => {
		const refusal = importRefusal(
			{
				code: "valuation_value_negative",
				exitCode: 3,
				message: "The values were rejected and nothing was written.",
				details: {
					values: [{ index: 3, reason: { message: "document.values.3.value: owes, not -1" } }],
				},
			},
			plan.sent,
		)
		expect(refusal.values).toEqual([
			{ row: 2, column: "Fund", account: "Fund", date: "2026-02-28", message: "owes, not -1" },
		])
		expect(refusedItems(refusal.values).shown[0]).toMatchObject({ place: "Row 2, column Fund" })
	})

	test("puts a refused account to count against at that field, and any other error as one sentence", () => {
		const against = importRefusal(
			{
				code: "valuation_against_invalid",
				exitCode: 3,
				message: "Not an income account.",
				hint: "Make one.",
			},
			plan.sent,
		)
		expect(against).toEqual({ values: [], against: "Not an income account. Make one." })
		expect(
			importRefusal({ code: "database_busy", exitCode: 7, message: "Busy." }, plan.sent),
		).toEqual({ values: [], general: "Busy." })
	})

	test("is the CLI's own counts when the dry run held", () => {
		const held = answer({ ok: true, preview: true, result: counts(3, 1) })
		expect(previewOf(held, plan.sent)).toEqual({ state: "ready", added: 3, unchanged: 1 })
		expect(previewLine(3, 1)).toContain("3 values would be recorded, and 1 already at that value")
	})
})

function counts(added: number, unchanged: number) {
	return {
		dryRun: true,
		file: "-",
		against: { id: "g", name: "Gains" },
		values: [],
		counts: { added, unchanged },
	}
}
