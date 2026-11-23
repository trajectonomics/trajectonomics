import { FIXTURE_ACCOUNTS } from "./ledger-fixture"
import type { CashflowRow } from "./projection/cashflow-view"
import { projection } from "./projection/testing"
import { runBody, tableOf } from "./projection-run-support"

/*
 * The hand-worked figures of `projection run --breakdown` (cli ADR-0058) and the helpers the breakdown
 * tests read them with. The plan is BREAKDOWN_SCENARIO: its first year's lines are worked out below
 * from the plan's own numbers, so a golden that drifts from them fails for a reason a person can read.
 */

/** The scenario and the two dates: one full year, from the As-of to the horizon. */
export const FLAGS: readonly string[] = [
	"--scenario",
	"breakdown",
	"--as-of",
	"2026-03-31",
	"--horizon",
	"2027-03-30",
]

/** The first roll-up's period, as the annual and cash-flow rows state it. */
export const YEAR = { index: 0, from: "2026-03-31", to: "2027-03-30" }

const INVESTMENT = FIXTURE_ACCOUNTS.investment
const LOAN = FIXTURE_ACCOUNTS.loan
const BANK = FIXTURE_ACCOUNTS.bank

/** The first year's lines in the engine's order, worked out by hand from the plan (in THB). */
export const HAND_YEAR: Omit<CashflowRow, "index" | "from" | "to">[] = [
	{ group: "income", id: "salary", account: null, category: null, amount: "120000.00" },
	{ group: "prepaid", id: "national", account: null, category: null, amount: "6000.00" },
	{ group: "settlement", id: "national", account: null, category: null, amount: "-1800.00" },
	{ group: "expense", id: "rent", account: null, category: "housing", amount: "30000.00" },
	{ group: "expense", id: "food", account: null, category: "food", amount: "18000.00" },
	{ group: "expense", id: "fees", account: null, category: null, amount: "1200.00" },
	{ group: "expense", id: "car", account: null, category: "transport", amount: "1500.00" },
	{ group: "category", id: "housing", account: null, category: null, amount: "30000.00" },
	{ group: "category", id: "food", account: null, category: null, amount: "18000.00" },
	{ group: "category", id: "transport", account: null, category: null, amount: "1500.00" },
	{ group: "category", id: null, account: null, category: null, amount: "1200.00" },
	{ group: "contribution", id: "invest", account: INVESTMENT, category: null, amount: "36000.00" },
	{ group: "contribution", id: "extra", account: INVESTMENT, category: null, amount: "28800.00" },
	{ group: "unfunded", id: "extra", account: INVESTMENT, category: null, amount: "19200.00" },
	{ group: "withdrawal", id: "borrow", account: LOAN, category: null, amount: "3000.00" },
	{ group: "drawn", id: null, account: INVESTMENT, category: null, amount: "1500.00" },
	{ group: "surplus", id: null, account: BANK, category: null, amount: "4800.00" },
]

/** A decimal string at the Currency's two places, as integer satang, so every sum is exact. */
export function satang(text: string): number {
	return Number(text.replace(".", ""))
}

/**
 * The identity of sim ADR-0018 for one roll-up, from its lines alone: money in equals money out.
 * It holds only if no line is lost or counted twice.
 */
export function identityHolds(rows: readonly CashflowRow[], index: number): boolean {
	const sumOf = (group: CashflowRow["group"]) =>
		rows
			.filter((row) => row.index === index && row.group === group)
			.reduce((total, row) => total + satang(row.amount), 0)
	const moneyIn = sumOf("income") + sumOf("withdrawal") + sumOf("drawn")
	const moneyOut =
		sumOf("prepaid") +
		sumOf("settlement") +
		sumOf("expense") +
		sumOf("contribution") +
		sumOf("surplus")
	return moneyIn + sumOf("unmet") === moneyOut
}

/** The first year's lines of a run's cash-flow table. */
export function yearLines(rows: readonly CashflowRow[]): CashflowRow[] {
	return rows.filter((row) => row.index === 0)
}

/** The first roll-up's block: its heading, then its lines up to the blank line after them. */
export function firstBlock(text: string): string[] {
	const lines = text.split("\n")
	const start = lines.findIndex((line) => line.startsWith(`cash flow ${YEAR.from} to ${YEAR.to}`))
	if (start === -1) throw new Error("the output has no cash-flow block for the first year")
	const block: string[] = []
	for (const line of lines.slice(start + 1)) {
		if (line === "") break
		block.push(line)
	}
	return block
}

/** The satang a block line states, read from its last column. */
export function blockAmount(block: readonly string[], label: string): number {
	const line = block.find((entry) => entry.trimStart().startsWith(`${label} `))
	if (line === undefined) throw new Error(`the block has no ${label} line`)
	return satang(line.trim().split(/\s+/).at(-1) ?? "")
}

/** The first year's lines of a `--breakdown --json` run with the given extra flags. */
export async function firstYearOf(home: string, extra: readonly string[]): Promise<CashflowRow[]> {
	const body = runBody(await projection(home, ["run", ...FLAGS, ...extra, "--breakdown"]))
	return yearLines(tableOf(body, "cashflow").rows)
}
