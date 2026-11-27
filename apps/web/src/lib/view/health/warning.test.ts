import { describe, expect, test } from "bun:test"
import type { Snapshot } from "../../contract"
import { healthWarningLabel } from "./warning"

/** A Snapshot holding one doctor read, with the given check statuses. */
function snapshot(statuses: readonly string[]): Snapshot {
	const checks = statuses.map((status, index) => ({
		name: "writable" as const,
		status: status as "pass" | "fail" | "skipped",
		detail: `check ${index}`,
	}))
	const doctor = {
		ok: false,
		cliVersion: "0.0.0",
		directory: { path: "~/.traj", exists: true, writable: false },
		database: { path: "~/.traj/traj.db", exists: true, bytes: 0, schemaVersion: 2, head: 2 },
		rows: { entity: 0, account: 0, tx: 0, posting: 0, scenario: 0 },
		checks,
	}
	return { reads: { doctor: { ok: true, argv: ["doctor"], data: doctor } } } as unknown as Snapshot
}

describe("healthWarningLabel", () => {
	test("names the failed checks the way the Overview does", () => {
		expect(healthWarningLabel(snapshot(["fail"]))).toBe("1 thing to check")
		expect(healthWarningLabel(snapshot(["fail", "fail"]))).toBe("2 things to check")
	})

	test("says nothing when every check passes", () => {
		expect(healthWarningLabel(snapshot(["pass", "skipped"]))).toBeNull()
	})

	test("says nothing when the Snapshot holds no doctor read", () => {
		const failed = { reads: { doctor: { ok: false } } } as unknown as Snapshot
		expect(healthWarningLabel(failed)).toBeNull()
	})
})
