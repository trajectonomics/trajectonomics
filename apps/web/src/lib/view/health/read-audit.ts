import type { Read, Snapshot } from "../../contract"
import { formatArgv } from "../../format"

/** One Read of the Snapshot, as the audit table shows it. */
export interface AuditRow {
	readonly key: string
	readonly question: string
	readonly command: string
	readonly failed: boolean
	/** The CLI's error code and message, when the Read failed. */
	readonly error: {
		readonly code: string
		readonly message: string
		readonly hint: string | null
	} | null
}

interface Entry {
	readonly question: string
	readonly read: Read<unknown>
}

/**
 * Every Read the Snapshot holds, flattened, with the question it answers. Failed Reads come first,
 * and the rest keep the Snapshot's order, so the audit trail starts with what did not work.
 */
export function readAudit(snapshot: Snapshot): AuditRow[] {
	return entriesOf(snapshot)
		.map((entry, index) => auditRow(entry, `${index}`))
		.sort((a, b) => Number(b.failed) - Number(a.failed))
}

function auditRow({ question, read }: Entry, key: string): AuditRow {
	const command = formatArgv(read.argv)
	if (read.ok) return { key, question, command, failed: false, error: null }
	const { code, message, hint } = read.error
	return { key, question, command, failed: true, error: { code, message, hint: hint ?? null } }
}

function entriesOf(snapshot: Snapshot): Entry[] {
	const { reads, params } = snapshot
	const history = reads.netWorthHistory.map((read, index) => ({
		question: `Net worth at ${params.historyDates[index] ?? "a month-end"}`,
		read,
	}))
	const projections = Object.entries(reads.projections).map(([name, read]) => ({
		question: `Projection of ${name}`,
		read,
	}))
	const fi = Object.entries(reads.fi).map(([name, read]) => ({
		question: `FI date of ${name}`,
		read,
	}))
	const compare =
		reads.compare === null ? [] : [{ question: "Comparison of two Scenarios", read: reads.compare }]
	return [
		{ question: "Ledger health (doctor)", read: reads.doctor },
		{ question: "Chart of accounts", read: reads.accounts },
		{ question: "Balances and trial balance", read: reads.balance },
		{ question: "Net worth at the As-of", read: reads.netWorth },
		...history,
		{ question: "Profit and loss for the period", read: reads.pnl },
		{ question: "Transactions in the period", read: reads.transactions },
		{ question: "Baseline at the As-of", read: reads.baseline },
		{ question: "Scenarios", read: reads.scenarios },
		...projections,
		...fi,
		...compare,
	]
}
