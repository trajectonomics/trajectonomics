import { describe, expect, test } from "bun:test"
import { demoSnapshotJson } from "../../../../scripts/demo-snapshot"
import { type Snapshot, snapshot } from "../../contract"
import { formatDate } from "../../format"
import { readAudit } from "./read-audit"

const DEMO = await demoSnapshotJson()
const demo: Snapshot = snapshot.parse(DEMO)

function withFailedPnl(source: Snapshot): Snapshot {
	return {
		...source,
		reads: {
			...source.reads,
			pnl: {
				argv: ["report", "pnl", "--since", "2026-01-01", "--until", "2026-10-31", "--json"],
				ok: false,
				error: {
					code: "LEDGER_EMPTY",
					exitCode: 2,
					message: "The ledger is empty.",
					hint: "Add one.",
				},
			},
		},
	}
}

function withFailedBaseline(source: Snapshot, code = "NEGATIVE_AMOUNT"): Snapshot {
	return {
		...source,
		reads: {
			...source.reads,
			baseline: {
				argv: ["baseline", "show", "--as-of", "2026-10-31", "--json"],
				ok: false,
				error: {
					code,
					exitCode: 3,
					message: "rows.fund: Fund holds -9.58 THB, which is negative once stated as an asset",
				},
			},
		},
	}
}

describe("readAudit", () => {
	test("lists every Read the Snapshot holds, once each", () => {
		const { reads } = demo
		// Nine single Reads: doctor, accounts, balance, net worth, P&L, transactions, baseline, run-rates, scenarios.
		const expected =
			9 +
			reads.netWorthHistory.length +
			Object.keys(reads.projections).length +
			Object.keys(reads.fi).length +
			(reads.compare === null ? 0 : 1)
		expect(readAudit(demo)).toHaveLength(expected)
	})

	test("lists the run-rates after the Baseline, when the Snapshot holds them", () => {
		const questions = readAudit(demo).map((row) => row.question)
		expect(questions.indexOf("Run-rates at the As-of")).toBe(
			questions.indexOf("Baseline at the As-of") + 1,
		)
	})

	test("leaves the run-rates out of a Snapshot saved before they were read", () => {
		const before = { ...demo.reads }
		delete before.rates
		const rows = readAudit({ ...demo, reads: before })
		expect(rows.some((row) => row.question === "Run-rates at the As-of")).toBe(false)
	})

	test("gives each Read its command, as a person could paste it", () => {
		const doctor = readAudit(demo).find((row) => row.question === "Ledger health (doctor)")
		expect(doctor?.command).toBe(`traj ${demo.reads.doctor.argv.join(" ")}`)
	})

	test("sorts a failed Read first, with the CLI's code and message", () => {
		const rows = readAudit(withFailedPnl(demo))
		expect(rows[0]).toMatchObject({
			question: "Profit and loss for the period",
			failed: true,
			error: { code: "LEDGER_EMPTY", message: "The ledger is empty.", hint: "Add one." },
		})
		expect(rows.slice(1).every((row) => row.failed === false || row.error !== null)).toBe(true)
	})

	test("keeps the Snapshot's order among the Reads that succeeded", () => {
		const rows = readAudit(withFailedPnl(demo)).filter((row) => !row.failed)
		const questions = rows.map((row) => row.question)
		expect(questions.indexOf("Chart of accounts")).toBeLessThan(questions.indexOf("Plans"))
	})

	test("dates each net worth history Read from the month it answers", () => {
		const first = readAudit(demo).find((row) => /^Net worth at \d/.test(row.question))
		expect(first?.question).toBe(`Net worth at ${formatDate(demo.params.historyDates[0] ?? "")}`)
	})

	test("gives every row a key unique in the table", () => {
		const keys = readAudit(withFailedPnl(demo)).map((row) => row.key)
		expect(new Set(keys).size).toBe(keys.length)
	})

	test("states an overdrawn Baseline plainly beside the CLI's refusal", () => {
		const [row] = readAudit(withFailedBaseline(demo))
		expect(row).toMatchObject({
			question: "Baseline at the As-of",
			failed: true,
			error: { code: "NEGATIVE_AMOUNT" },
		})
		expect(row?.note).toContain("overdrawn asset")
	})

	test("leaves the note off a Baseline that failed another way", () => {
		const [row] = readAudit(withFailedBaseline(demo, "INVALID_DATE"))
		expect(row?.note).toBeNull()
	})

	test("keys the note off the Read's own command, not the question that heads its row", () => {
		// The Baseline slot holding another command's Read stands in for a renamed question: the note
		// follows `baseline show`, so a row that only looks like the Baseline gets none.
		const mislabelled: Snapshot = {
			...demo,
			reads: {
				...demo.reads,
				baseline: {
					argv: ["report", "pnl", "--since", "2026-01-01", "--until", "2026-10-31", "--json"],
					ok: false,
					error: {
						code: "NEGATIVE_AMOUNT",
						exitCode: 3,
						message: "A column holds a negative amount.",
					},
				},
			},
		}
		const row = readAudit(mislabelled).find((entry) => entry.question === "Baseline at the As-of")
		expect(row?.note).toBeNull()
	})
})
