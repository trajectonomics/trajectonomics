import { type ColumnHint, isRecord, tableLines } from "../table/lines"

/*
 * `projection run`'s human view of the lifetime totals (cli ADR-0067): the plan's fees on a line of their
 * own, labelled apart from each Account's totals, which are a table. It prints the engine's figures as
 * the result states them and adds nothing.
 */

const COLUMNS: readonly ColumnHint[] = [
	{ key: "account", label: "account" },
	{ key: "lifetimeFees", label: "lifetimeFees", align: "right", optional: true },
	{ key: "lifetimePayouts", label: "lifetimePayouts", align: "right", optional: true },
]

/** The plan-wide fees line, then each Account's totals; nothing when the result states none. */
export function lifetimeBlocks(data: Record<string, unknown>): string[] {
	const plan = data["lifetimeFees"]
	const accounts = data["accountLifetimes"]
	return [
		...(typeof plan === "string" ? [`Fees over the plan, all accounts: ${plan}`] : []),
		...(Array.isArray(accounts) && accounts.every(isRecord) && accounts.length > 0
			? [tableLines("accountLifetimes", accounts.length, accounts, COLUMNS)]
			: []),
	]
}
