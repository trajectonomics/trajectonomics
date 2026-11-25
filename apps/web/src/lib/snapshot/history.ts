import type { NetWorth, NetWorthMonthly, Read } from "../contract"
import { CONTRACT_MISMATCH } from "./decode-read"
import { type PlannedRead, plainRead } from "./planned"

/**
 * The argv of the single-date read of one month-end. Each Read of the history names it, because it states the
 * figures the batched read states for that date (cli ADR 0077) and is the command a person can run to check one.
 */
export function historyArgv(date: string): string[] {
	return ["report", "networth", "--as-of", date, "--json"]
}

/**
 * The one read of the whole history: `report networth --monthly` from the first month-end to the last, which are
 * the dates the Plan chose. A history with no month-end needs no read.
 */
export function planHistory(dates: readonly string[]): PlannedRead | null {
	const first = dates[0]
	const last = dates.at(-1)
	if (first === undefined || last === undefined) return null
	return plainRead(["report", "networth", "--monthly", "--since", first, "--until", last, "--json"])
}

/**
 * The history's Reads, one per planned date, from the one monthly Read. A date `traj` refused is a failed Read with
 * the refusal `--as-of` gives, and a call that failed as a whole fails every date, as one call per date did. The
 * result is what a call per date would have held, so nothing downstream knows the read was batched.
 */
export function historyReads(
	dates: readonly string[],
	read: Read<NetWorthMonthly>,
): Read<NetWorth>[] {
	const months = read.ok ? new Map(read.data.months.map((month) => [month.asOf, month])) : null
	return dates.map((date): Read<NetWorth> => {
		const argv = historyArgv(date)
		if (!read.ok) return { argv, ok: false, error: read.error }
		const month = months?.get(date)
		if (month === undefined) {
			const message = `the monthly read states no month-end ${date}`
			return { argv, ok: false, error: { code: CONTRACT_MISMATCH, exitCode: 1, message } }
		}
		return "error" in month
			? { argv, ok: false, error: month.error }
			: { argv, ok: true, data: month }
	})
}
