import type { AccountList, NetWorth, Read, ScenarioList } from "../contract"
import type { StageOneReads } from "./stage-one"

/** A failed Read, as the runner keeps it: the argv and the CLI's error envelope. */
export function failedRead<T>(argv: string[], code = "not_found"): Read<T> {
	return { argv, ok: false, error: { code, exitCode: 4, message: `${code} message` } }
}

/** A Scenario list holding the given names, with fixed ids, hashes and dates. */
export function scenarioList(names: string[]): ScenarioList {
	return {
		scenarios: names.map((name, index) => ({
			id: `id-${index}`,
			name,
			contentHash: `hash-${index}`,
			forkedFrom: null,
			version: 1,
			createdAt: "2026-01-01T00:00:00.000Z",
			updatedAt: "2026-01-01T00:00:00.000Z",
		})),
	}
}

/** Net worth at an As-of with the given first transaction date and no rows. */
export function netWorth(asOf: string, firstTransactionDate: string | null): NetWorth {
	return {
		asOf,
		firstTransactionDate,
		noTransactionsBefore: false,
		rows: [],
		totals: [],
	}
}

/** An account list with no accounts. */
export const emptyAccounts: AccountList = { accounts: [] }

/** Stage one's reads for a ledger with the given Scenario names and first transaction date. */
export function stageOne(
	asOf: string,
	names: string[],
	firstTransactionDate: string | null = "2024-11-01",
): StageOneReads {
	const argv = ["report", "networth", "--as-of", asOf, "--json"]
	return {
		scenarios: { argv: ["scenario", "list", "--json"], ok: true, data: scenarioList(names) },
		accounts: { argv: ["account", "list", "--json"], ok: true, data: emptyAccounts },
		netWorth: { argv, ok: true, data: netWorth(asOf, firstTransactionDate) },
	}
}
