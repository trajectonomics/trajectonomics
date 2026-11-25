import { describe, expect, test } from "bun:test"
import type { NetWorth, NetWorthMonthly, Read } from "../contract"
import { CONTRACT_MISMATCH } from "./decode-read"
import { historyArgv, historyReads, planHistory } from "./history"

const month = (asOf: string): NetWorth => ({
	asOf,
	firstTransactionDate: "2026-01-01",
	noTransactionsBefore: false,
	rows: [],
	totals: [{ currency: "THB", amount: "1.00" }],
})
const refusal = { code: "AMOUNT_OVERFLOW", exitCode: 3, message: "too big", path: "totals" }
const dates = ["2026-01-31", "2026-02-28", "2026-03-31"]
const argv = ["report", "networth", "--monthly", "--json"]
const held = (months: NetWorthMonthly["months"]): Read<NetWorthMonthly> => ({
	argv,
	ok: true,
	data: { since: null, until: "2026-03-31", months },
})

describe("planHistory", () => {
	test("is one read from the first month-end to the last, and none for no month-end", () => {
		expect(planHistory(dates)?.argv).toEqual([
			...["report", "networth", "--monthly", "--since", "2026-01-31", "--until", "2026-03-31"],
			"--json",
		])
		expect(planHistory([])).toBeNull()
	})
})

describe("historyReads", () => {
	test("is one Read per planned date, each naming the single-date argv", () => {
		const reads = historyReads(dates, held(dates.map(month)))
		expect(reads.map((read) => read.argv)).toEqual(dates.map(historyArgv))
		expect(reads).toEqual(
			dates.map((date) => ({ argv: historyArgv(date), ok: true, data: month(date) })),
		)
	})

	test("keeps a refused month as the failed Read the single-date call gave, and the others", () => {
		const reads = historyReads(
			dates,
			held([month(dates[0]!), { asOf: dates[1]!, error: refusal }, month(dates[2]!)]),
		)
		expect(reads.map((read) => read.ok)).toEqual([true, false, true])
		expect(reads[1]).toEqual({ argv: historyArgv(dates[1]!), ok: false, error: refusal })
	})

	test("fails every date with the error of a call that failed as a whole", () => {
		const failed: Read<NetWorthMonthly> = {
			argv,
			ok: false,
			error: { code: "database_busy", exitCode: 4, message: "busy" },
		}
		const reads = historyReads(dates, failed)
		expect(reads).toHaveLength(3)
		for (const read of reads) expect(read.ok === false && read.error.code).toBe("database_busy")
	})

	test("fails a date the monthly read does not state, as a contract mismatch", () => {
		const reads = historyReads(dates, held([month(dates[0]!)]))
		expect(reads[1]).toMatchObject({ ok: false, error: { code: CONTRACT_MISMATCH } })
	})
})
