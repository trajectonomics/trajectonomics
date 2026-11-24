import { expect } from "bun:test"
import type { Captured } from "./test-support"
import { type Account, accounts, cli, ledgerHome, type Traj } from "./tx-test-support"

export type Valued = {
	dryRun: boolean
	status: "added" | "unchanged"
	account: Account
	against: Account
	date: string
	before: string
	value: string
	difference: string
	transaction: { id: string | null; memo: string; postings: { amount: string }[] } | null
	notes: string[]
}

export type ValuedBatch = {
	dryRun: boolean
	file: string
	against: Account
	values: (Omit<Valued, "dryRun" | "against"> & { index: number })[]
	counts: { added: number; unchanged: number }
}

export type Chart = Record<"Fund" | "Home" | "Loan" | "Gains" | "Equity" | "Food", Account>

/** A ledger with an asset fund, a home, a loan, an income account and an equity account. */
export async function chartHome(): Promise<{ home: string; traj: Traj; chart: Chart }> {
	const home = ledgerHome()
	const traj = cli(home)
	const chart = await accounts(traj, [
		["Fund", "asset"],
		["Home", "asset"],
		["Loan", "liability"],
		["Gains", "income"],
		["Equity", "equity"],
		["Food", "expense"],
	])
	return { home, traj, chart: chart as Chart }
}

/** `traj account value` with its four flags, as JSON. */
export function value(
	traj: Traj,
	account: string,
	amount: string,
	date: string,
	against = "Gains",
	...more: string[]
): Promise<Captured> {
	const flags = ["--value", amount, "--date", date, "--against", against]
	return traj(["account", "value", account, ...flags, ...more, "--json"])
}

export const parsed = <T>(res: { out: string }): T => JSON.parse(res.out) as T

/** A balance row's amount for one account on a date. */
export async function balanceOf(traj: Traj, name: string, asOf: string): Promise<string> {
	const res = await traj(["balance", "--as-of", asOf, "--json"])
	expect(res.code).toBe(0)
	const rows = JSON.parse(res.out).rows as { account: { name: string }; amount: string }[]
	return rows.find((row) => row.account.name === name)!.amount
}
