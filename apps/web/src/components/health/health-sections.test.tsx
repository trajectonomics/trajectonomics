import { describe, expect, test } from "bun:test"
import { renderToStaticMarkup } from "react-dom/server"

import { type Doctor, type Read, type Snapshot, snapshot } from "../../lib/contract"
import { formatDate } from "../../lib/format"
import { LedgerHealthSection } from "./LedgerHealthSection"
import { ReadsSection } from "./ReadsSection"
import { SnapshotSection } from "./SnapshotSection"

const DEMO = await Bun.file(`${import.meta.dir}/../../../public/demo/snapshot.json`).json()
const demo: Snapshot = snapshot.parse(DEMO)

const doctor: Doctor = {
	ok: true,
	cliVersion: "9.9.9",
	directory: { path: "~/.traj", exists: true, writable: true },
	database: { path: "~/.traj/traj.db", exists: true, bytes: 4096, schemaVersion: 2, head: 2 },
	rows: { entity: 1, account: 2, tx: 0, posting: 0, scenario: 0 },
	checks: [{ name: "ledger", status: "pass", detail: "0 transactions validate." }],
}

const ok = (data: Doctor): Read<Doctor> => ({ argv: ["doctor", "--json"], ok: true, data })

describe("LedgerHealthSection", () => {
	test("shows OK, the CLI version and the checks when the doctor passes", () => {
		const html = renderToStaticMarkup(<LedgerHealthSection doctor={ok(doctor)} />)
		expect(html).toContain("OK")
		expect(html).toContain("traj 9.9.9")
		expect(html).toContain("0 transactions validate.")
		expect(html).toContain("4,096 bytes")
		expect(html).toContain("The doctor did not check the trial balance.")
	})

	test("says it needs attention and that the trial balance does not balance when it does not", () => {
		const failing: Doctor = {
			...doctor,
			ok: false,
			trialBalance: {
				asOf: "2026-10-31",
				totals: [{ currency: "THB", debit: "10.00", credit: "9.00" }],
				balanced: false,
			},
		}
		const html = renderToStaticMarkup(<LedgerHealthSection doctor={ok(failing)} />)
		expect(html).toContain("Needs attention")
		expect(html).toContain("Does not balance")
	})

	test("shows the CLI's error in its section when the doctor failed", () => {
		const failed: Read<Doctor> = {
			argv: ["doctor", "--json"],
			ok: false,
			error: { code: "DB_LOCKED", exitCode: 3, message: "The database is locked." },
		}
		const html = renderToStaticMarkup(<LedgerHealthSection doctor={failed} />)
		expect(html).toContain("Ledger health could not be read")
		expect(html).toContain("The database is locked.")
	})
})

describe("ReadsSection", () => {
	test("lists every Read with its command, and puts a failed Read first with its code and message", () => {
		const failed: Snapshot = {
			...demo,
			reads: {
				...demo.reads,
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
		const html = renderToStaticMarkup(<ReadsSection snapshot={failed} />)
		expect(html).toContain("Failed: LEDGER_EMPTY")
		expect(html).toContain("The ledger is empty.")
		expect(html).toContain("Add one.")
		expect(html.indexOf("Profit and loss for the period")).toBeLessThan(
			html.indexOf("Chart of accounts"),
		)
		expect(html).toContain("traj balance --as-of")
	})
})

describe("SnapshotSection", () => {
	test("states the As-of the Snapshot was planned from and the two versions", () => {
		const html = renderToStaticMarkup(<SnapshotSection snapshot={demo} />)
		expect(html).toContain(formatDate(demo.params.asOf))
		expect(html).toContain(`>${demo.cliVersion}<`)
		expect(html).toContain("Snapshot version")
	})
})
