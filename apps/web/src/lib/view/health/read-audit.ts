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
	/** A plain statement of a refusal only the CLI's words would leave opaque, or null. */
	readonly note: string | null
}

interface Entry {
	readonly question: string
	readonly read: Read<unknown>
}

const BASELINE = "Baseline at the As-of"

/**
 * The plain statement beside a Baseline that refuses an overdrawn asset or an overpaid loan
 * (cli ADR-0026): every amount the engine states is non-negative, so the whole plan cannot be
 * projected until the Balance is corrected.
 */
const BASELINE_NOTE =
	"The Baseline cannot state an overdrawn asset or an overpaid loan, so this plan cannot be projected. Correct the account's balance, then read again."

/**
 * Whether a Read is the one that reads the Baseline: `traj baseline show`. The note follows the command,
 * so renaming the question that heads the row cannot drop it.
 */
function isBaselineRead(argv: readonly string[]): boolean {
	return argv[0] === "baseline" && argv[1] === "show"
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
	if (read.ok) return { key, question, command, failed: false, error: null, note: null }
	const { code, message, hint } = read.error
	const note = isBaselineRead(read.argv) && code === "NEGATIVE_AMOUNT" ? BASELINE_NOTE : null
	return {
		key,
		question,
		command,
		failed: true,
		error: { code, message, hint: hint ?? null },
		note,
	}
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
		{ question: BASELINE, read: reads.baseline },
		{ question: "Scenarios", read: reads.scenarios },
		...projections,
		...fi,
		...compare,
	]
}
