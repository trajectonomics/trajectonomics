// The balance-history import against the real traj, over the fictional ledger: a pasted spreadsheet is parsed,
// matched and previewed (nothing written), then imported, and the Net worth history chart covers the twelve
// months (web ADR 0008, the amendment of 2026-11-25).
import { afterAll, afterEach, describe, expect, test } from "bun:test"
import { accountValues, type Snapshot, snapshot } from "../src/lib/contract"
import { autoMatches, targetsOf } from "../src/lib/view/import-values/match"
import { parseImport } from "../src/lib/view/import-values/parse"
import { importEdit, importPlan } from "../src/lib/view/import-values/plan"
import { importRefusal } from "../src/lib/view/import-values/refusals"
import { netWorthPageView } from "../src/lib/view/net-worth/page"
import { valueSheet } from "../src/lib/view/record-values/sheet"
import type { ValueSheet } from "../src/lib/view/record-values/types"
import {
	BINARY,
	disposeEditor,
	ledgerHome,
	postEdit,
	SLOW_MS,
	setupEditor,
} from "./edit-fixture.test-support"
import { settle } from "./editor-running.test-support"

/** Twelve month-ends before the demo ledger's first transaction, one row each, with thousands separators as a spreadsheet pastes them. */
const MONTH_ENDS = [
	"2023-11-30",
	"2023-12-31",
	"2024-01-31",
	"2024-02-29",
	"2024-03-31",
	"2024-04-30",
	"2024-05-31",
	"2024-06-30",
	"2024-07-31",
	"2024-08-31",
	"2024-09-30",
	"2024-10-31",
] as const
const SHEET = [
	"Month\tBank\tFund",
	...MONTH_ENDS.map((date, at) => `${date}\t${100 + at},000.00\t${200 + 2 * at},000.00`),
].join("\n")

async function held(): Promise<Snapshot> {
	return snapshot.parse(JSON.parse((await setupEditor()).body ?? "null"))
}

/** How many transactions the ledger holds, read by traj itself. */
function transactionCount(): number {
	const run = Bun.spawnSync([BINARY, "tx", "list", "--json"], {
		env: { ...process.env, TRAJ_HOME: ledgerHome() },
	})
	return (JSON.parse(run.stdout.toString()) as { transactions: unknown[] }).transactions.length
}

/** The wizard's own steps, as the page runs them: parse, match, plan, then the Edit with or without `preview`. */
async function planOf(text: string, sheet: ValueSheet) {
	const parsed = parseImport(text, "dates-down")
	const matches = autoMatches(parsed.sources, targetsOf(sheet))
	const against = sheet.choices.find((choice) => choice.name === "Fund Return")?.id ?? ""
	return { parsed, plan: importPlan(parsed, matches), against }
}

afterEach(settle, SLOW_MS)
afterAll(disposeEditor)

describe("importing a balance history", () => {
	test(
		"twelve months for two accounts: a preview writes nothing, the import does, and the history chart covers them",
		async () => {
			const before = await held()
			const sheet = valueSheet(before) as ValueSheet
			const { parsed, plan, against } = await planOf(SHEET, sheet)
			expect(parsed.problems).toEqual([])
			expect(plan.sent).toHaveLength(24)
			const first = netWorthPageView(before).history
			expect(first.line).toContain("from Nov 2024")
			const written = transactionCount()

			const preview = await postEdit(JSON.stringify(importEdit(plan, against, true)))
			expect(preview.status).toBe(200)
			const previewed = preview.answer as unknown as {
				ok: boolean
				preview?: boolean
				snapshot?: unknown
				result: unknown
			}
			expect(previewed.ok).toBe(true)
			expect(previewed.preview).toBe(true)
			expect(previewed.snapshot).toBeUndefined()
			const dry = accountValues.parse(previewed.result)
			expect(dry.dryRun).toBe(true)
			expect(dry.counts).toEqual({ added: 24, unchanged: 0 })
			expect(transactionCount()).toBe(written)
			expect(netWorthPageView(await held()).history.line).toBe(first.line)

			const imported = await postEdit(JSON.stringify(importEdit(plan, against, false)))
			if (!imported.answer.ok) throw new Error(imported.answer.error.message)
			const result = accountValues.parse((imported.answer as unknown as { result: unknown }).result)
			expect(result.dryRun).toBe(false)
			expect(result.counts.added).toBe(24)
			expect(transactionCount()).toBe(written + 24)

			const after = netWorthPageView(snapshot.parse(imported.answer.snapshot)).history
			expect(after.line).toContain("from Nov 2023 to Oct 2026")
			const labels = after.series.points.map((point) => point.xLabel)
			expect(labels.slice(0, 12)).toEqual([
				"Nov 2023",
				"Dec 2023",
				"Jan 2024",
				"Feb 2024",
				"Mar 2024",
				"Apr 2024",
				"May 2024",
				"Jun 2024",
				"Jul 2024",
				"Aug 2024",
				"Sep 2024",
				"Oct 2024",
			])
			// The CLI's own totals at the first and the last imported month-end: the two values stated, added by traj.
			const totals = snapshot
				.parse(imported.answer.snapshot)
				.reads.netWorthHistory.map((read) => (read.ok ? read.data.totals?.[0]?.amount : null))
			expect(totals[0]).toBe("300000.00")
			expect(totals[11]).toBe("333000.00")
		},
		SLOW_MS,
	)

	test(
		"a refused value in the preview is named by its row and column in the table, and nothing is written",
		async () => {
			const sheet = valueSheet(await held()) as ValueSheet
			const text = "Month,Bank,Car Loan\n2026-09-30,1,2\n2026-10-31,3,-5"
			const { plan, against } = await planOf(text, sheet)
			const written = transactionCount()
			const { answer } = await postEdit(JSON.stringify(importEdit(plan, against, true)))
			expect(answer.ok).toBe(false)
			if (answer.ok) return
			const refusal = importRefusal(answer.error as never, plan.sent)
			expect(refusal.values).toEqual([
				{
					row: 3,
					column: "Car Loan",
					account: "Car Loan",
					date: "2026-10-31",
					message: expect.any(String),
				},
			])
			expect(transactionCount()).toBe(written)
		},
		SLOW_MS,
	)
})
