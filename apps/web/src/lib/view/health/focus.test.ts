import { describe, expect, test } from "bun:test"
import type { Doctor, Snapshot } from "../../contract"
import { DEMO, DEMO_DOCTOR } from "../what-if/fixtures.test-support"
import { healthFocusView } from "./focus"

/** The Demo's doctor with one check failed, as the CLI would state a broken ledger. */
function failedDoctor(index: number, detail: string): Doctor {
	const doctor = structuredClone(DEMO_DOCTOR)
	const check = doctor.checks[index]
	if (check === undefined) throw new Error("the Demo has this check")
	doctor.checks[index] = { ...check, status: "fail", detail }
	return doctor
}

/** The Demo with its profit and loss Read failed. */
function withFailedPnl(snapshot: Snapshot): Snapshot {
	return {
		...snapshot,
		reads: {
			...snapshot.reads,
			pnl: {
				argv: ["report", "pnl", "--since", "2026-01-01", "--until", "2026-10-31", "--json"],
				ok: false,
				error: { code: "LEDGER_EMPTY", exitCode: 2, message: "The ledger is empty." },
			},
		},
	}
}

describe("healthFocusView", () => {
	test("says all good when every check of the doctor passes, and draws every check", () => {
		const focus = healthFocusView(DEMO_DOCTOR, DEMO)
		expect(focus?.label).toBe("Is everything in order? All good.")
		expect(focus?.answer).toBe("All good")
		expect(focus?.tone).toBe("plain")
		expect(focus?.action).toBeUndefined()
		expect(focus?.checks.map((check) => [check.key, check.passed])).toEqual([
			["directory", true],
			["writable", true],
			["database", true],
			["integrity", true],
			["ledger", true],
			["trialBalance", true],
		])
	})

	test("says how many to check, names the first, and links to its row", () => {
		const focus = healthFocusView(failedDoctor(4, "3 transactions are unbalanced."), DEMO)
		expect(focus?.label).toBe(
			"Is everything in order? 1 to check. Ledger: 3 transactions are unbalanced.",
		)
		expect(focus?.answer).toBe("1 to check")
		expect(focus?.tone).toBe("warn")
		expect(focus?.checks.find((check) => check.key === "ledger")?.passed).toBe(false)
		expect(focus?.action).toEqual({ label: "See the first one", href: "#check-ledger" })
	})

	test("counts a failed Read as a check too, and links to the audit row", () => {
		const snapshot = withFailedPnl(DEMO)
		const focus = healthFocusView(DEMO_DOCTOR, snapshot)
		const failed = focus?.checks.at(-1)
		expect(failed).toMatchObject({
			label: "Profit and loss for the period",
			detail: "LEDGER_EMPTY: The ledger is empty.",
			passed: false,
		})
		expect(failed?.key).toBeDefined()
		expect(focus?.label).toBe(
			"Is everything in order? 1 to check. Profit and loss for the period: LEDGER_EMPTY: The ledger is empty.",
		)
		expect(focus?.action).toEqual({
			label: "See the first one",
			href: `#check-${failed?.key}`,
		})
	})

	test("has no focus point when there is no check to draw", () => {
		expect(healthFocusView({ ...DEMO_DOCTOR, checks: [] }, DEMO)).toBeNull()
	})
})
