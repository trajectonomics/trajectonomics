import { describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { demoSnapshotText } from "../../../scripts/demo-snapshot"
import {
	type Doctor,
	type Read,
	type Snapshot,
	snapshot as snapshotSchema,
} from "../../lib/contract"
import { formatDate } from "../../lib/format"
import LedgerHealthSection from "./LedgerHealthSection.svelte"
import ReadsSection from "./ReadsSection.svelte"
import SnapshotSection from "./SnapshotSection.svelte"

// The Demo supplies only the shape of a Snapshot and its dates: each assertion reads them from it, so the
// test survives a rebuilt Demo. Every figure asserted in the sections below is a hand-made fixture.
const DEMO_TEXT = await demoSnapshotText()
const demo: Snapshot = snapshotSchema.parse(JSON.parse(DEMO_TEXT))

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
		const { body } = render(LedgerHealthSection, { props: { doctor: ok(doctor) } })
		expect(body).toContain("OK")
		expect(body).toContain("traj 9.9.9")
		expect(body).toContain("0 transactions validate.")
		expect(body).toContain("4,096 bytes")
		expect(body).toContain("The doctor did not check the trial balance.")
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
		const { body } = render(LedgerHealthSection, { props: { doctor: ok(failing) } })
		expect(body).toContain("Needs attention")
		expect(body).toContain("Does not balance")
	})

	test("shows the CLI's error in its section when the doctor failed", () => {
		const failed: Read<Doctor> = {
			argv: ["doctor", "--json"],
			ok: false,
			error: { code: "DB_LOCKED", exitCode: 3, message: "The database is locked." },
		}
		const { body } = render(LedgerHealthSection, { props: { doctor: failed } })
		expect(body).toContain("Ledger health could not be read")
		expect(body).toContain("The database is locked.")
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
		const { body } = render(ReadsSection, { props: { snapshot: failed } })
		expect(body).toContain("Failed: LEDGER_EMPTY")
		expect(body).toContain("The ledger is empty.")
		expect(body).toContain("Add one.")
		expect(body.indexOf("Profit and loss for the period")).toBeLessThan(
			body.indexOf("Chart of accounts"),
		)
		expect(body).toContain("traj report pnl --since 2026-01-01 --until 2026-10-31 --json")
	})
})

describe("SnapshotSection", () => {
	test("states the As-of the Snapshot was planned from and the two versions", () => {
		const { body } = render(SnapshotSection, { props: { snapshot: demo } })
		expect(body).toContain(formatDate(demo.params.asOf))
		expect(body).toContain(`>${demo.cliVersion}<`)
		expect(body).toContain("Snapshot version")
	})
})
