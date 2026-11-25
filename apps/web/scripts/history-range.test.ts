// The Net worth history reaches back as far as the imported values (web ADR 0027), against the real traj over the
// fictional ledger: five years of month-end values are imported and the history starts at the first of them, and a
// value older than the cap keeps the latest ten years and says so.
import { afterAll, afterEach, describe, expect, test } from "bun:test"
import { type Snapshot, snapshot } from "../src/lib/contract"
import { HISTORY_MONTHS, monthEnd } from "../src/lib/snapshot/dates"
import { autoMatches, targetsOf } from "../src/lib/view/import-values/match"
import { parseImport } from "../src/lib/view/import-values/parse"
import { importEdit, importPlan } from "../src/lib/view/import-values/plan"
import { netWorthPageView } from "../src/lib/view/net-worth/page"
import { valueSheet } from "../src/lib/view/record-values/sheet"
import type { ValueSheet } from "../src/lib/view/record-values/types"
import { disposeEditor, postEdit, SLOW_MS, setupEditor } from "./edit-fixture.test-support"
import { running, settle } from "./loans-running.test-support"

/** The month-ends from a month through another, as `YYYY-MM-DD`. */
function monthEnds(from: [number, number], count: number): string[] {
	return Array.from({ length: count }, (_, at) => {
		const index = from[0] * 12 + (from[1] - 1) + at
		return monthEnd(Math.floor(index / 12), (index % 12) + 1)
	})
}

/** A spreadsheet of one row per month-end, as it is pasted, for the Bank and the Fund. */
function sheetOf(dates: string[]): string {
	const rows = dates.map((date, at) => `${date}\t${100 + at},000.00\t${200 + 2 * at},000.00`)
	return ["Month\tBank\tFund", ...rows].join("\n")
}

/** The Edit's answer as the page gets it: sent as the editor takes one Edit at a time, and tracked for `settle`. */
async function importSheet(text: string): Promise<Snapshot> {
	const held = snapshot.parse(JSON.parse((await setupEditor()).body ?? "null"))
	const sheet = valueSheet(held) as ValueSheet
	const parsed = parseImport(text, "dates-down")
	expect(parsed.problems).toEqual([])
	const plan = importPlan(parsed, autoMatches(parsed.sources, targetsOf(sheet)))
	const against = sheet.choices.find((choice) => choice.name === "Fund Return")?.id ?? ""
	const sent = postEdit(JSON.stringify(importEdit(plan, against, false)))
	running.add(sent)
	const { answer } = await sent.finally(() => running.delete(sent))
	if (!answer.ok) throw new Error(answer.error.message)
	return snapshot.parse(answer.snapshot)
}

afterEach(settle, SLOW_MS)
afterAll(disposeEditor)

describe("the history after an import of values older than the ledger", () => {
	test(
		"five years of month-end values: the history starts at the first imported month and keeps every month",
		async () => {
			// The demo ledger's first transaction is in Nov 2024; five years of month-ends end the month before it.
			const dates = monthEnds([2019, 11], 60)
			expect(dates.at(-1)).toBe("2024-10-31")
			const after = await importSheet(sheetOf(dates))
			expect(after.params.historyDates[0]).toBe("2019-11-30")
			expect(after.params.historyDates.at(-1)).toBe("2026-10-31")
			expect(after.params.historyDates).toHaveLength(84)
			expect(after.reads.netWorthHistory).toHaveLength(84)
			const history = netWorthPageView(after).history
			expect(history.series.points[0]?.xLabel).toBe("Nov 2019")
			expect(history.line).toContain("from Nov 2019 to Oct 2026")
			expect(history.cut).toBeNull()
			// The CLI's own total at the first imported month-end: the two values stated, added by traj.
			const first = after.reads.netWorthHistory[0]
			expect(first?.ok ? first.data.totals[0]?.amount : null).toBe("300000.00")
		},
		SLOW_MS,
	)

	test(
		"a value older than the cap keeps the latest ten years and the page says where the ledger starts",
		async () => {
			const after = await importSheet("Month\tBank\n2010-01-31\t1,000.00")
			expect(after.params.historyDates).toHaveLength(HISTORY_MONTHS)
			expect(after.params.historyDates[0]).toBe("2016-11-30")
			const history = netWorthPageView(after).history
			expect(history.line).toContain("from Nov 2016 to Oct 2026")
			expect(history.cut).toBe(
				"The ledger's first entry is in Jan 2010, but the chart shows only the latest 120 month-ends, from Nov 2016. Earlier months are left out.",
			)
		},
		SLOW_MS,
	)
})
