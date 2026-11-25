import type {
	AccountType,
	AmountRow,
	CurrencyTotal,
	Doctor,
	NetWorth,
	Pnl,
	Read,
} from "../../contract"

/** An amount row for a named account, in THB unless a currency is given. */
export function row(name: string, type: AccountType, amount: string, currency = "THB"): AmountRow {
	return { account: { id: `id-${name}`, name }, type, amount, currency }
}

/** A successful Read of the given data. */
export function okRead<T>(argv: string[], data: T): Read<T> {
	return { argv, ok: true, data }
}

/** A failed Read, as the runner keeps it: the argv and the CLI's error envelope. */
export function failedRead<T>(argv: string[], code = "LEDGER_EMPTY"): Read<T> {
	return {
		argv,
		ok: false,
		error: { code, exitCode: 2, message: `${code} message`, hint: "Record a transaction." },
	}
}

/** A `report networth` result with the given rows and totals, and the first transaction's date. */
export function netWorth(
	asOf: string,
	rows: AmountRow[],
	totals: CurrencyTotal[] | null,
	firstTransactionDate: string | null = "2024-11-01",
	noTransactionsBefore = false,
): NetWorth {
	const base = { asOf, firstTransactionDate, noTransactionsBefore, rows, totals }
	// A null total is one the CLI refused, and it says why (cli ADR 0078).
	return totals === null
		? {
				...base,
				totalsError: {
					code: "AMOUNT_OVERFLOW",
					exitCode: 3,
					message: "totals[THB]: exceeds the safe integer range",
				},
			}
		: base
}

/** A `report pnl` result over the given period. */
export function pnl(
	rows: AmountRow[],
	totals: CurrencyTotal[],
	since: string | null = "2026-01-01",
	until = "2026-10-31",
): Pnl {
	return { since, until, project: null, rows, totals }
}

/** A `doctor` result with the given checks and row counts. */
export function doctor(checks: Doctor["checks"], ok = true): Doctor {
	return {
		ok,
		cliVersion: "0.0.0",
		directory: { path: "~/.traj", exists: true, writable: true },
		database: {
			path: "~/.traj/traj.db",
			exists: true,
			bytes: 1,
			schemaVersion: 2,
			head: 2,
		},
		rows: { entity: 1, account: 3, tx: 4, posting: 8, scenario: 1 },
		checks,
	}
}

/** A check that passed. */
export function passed(name: Doctor["checks"][number]["name"]): Doctor["checks"][number] {
	return { name, status: "pass", detail: "Fine." }
}

/** A check that failed. */
export function failed(name: Doctor["checks"][number]["name"]): Doctor["checks"][number] {
	return { name, status: "fail", detail: "Broken." }
}
