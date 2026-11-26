import { describe, expect, test } from "bun:test"
import type { Snapshot } from "../contract"
import { stillCurrent, withAllowances, withChance } from "./reread"
import type { StageOneReads } from "./stage-one"

const read = (value: string) => ({ argv: ["x"], ok: true as const, data: { value } })
const failed = (code: string) => ({
	argv: ["x"],
	ok: false as const,
	error: { code, exitCode: 5, message: code },
})

/** A held Snapshot whose every Read is one that succeeded, with `over` replacing the Reads it names. */
function holding(over: Record<string, unknown> = {}): Snapshot {
	const reads = {
		scenarios: read("a"),
		accounts: read("b"),
		netWorth: read("c"),
		doctor: read("d"),
		balance: read("e"),
		pnl: read("f"),
		transactions: read("g"),
		baseline: read("h"),
		netWorthHistory: [],
		documents: {},
		projections: {},
		fi: {},
		chance: {},
		paths: {},
		allowances: {},
		taxNotes: {},
		compare: null,
		...over,
	}
	return {
		snapshotVersion: 1,
		params: { asOf: "2027-01-01", allowances: null },
		cliVersion: "test",
		reads,
	} as unknown as Snapshot
}
const held = holding()
const same = {
	scenarios: read("a"),
	accounts: read("b"),
	netWorth: read("c"),
} as unknown as StageOneReads

describe("stillCurrent", () => {
	test("holds when the three stage-one reads are the held ones", () => {
		expect(stillCurrent(held, same)).toBe(true)
	})

	test("fails when any one differs", () => {
		for (const key of ["scenarios", "accounts", "netWorth"] as const) {
			expect(
				stillCurrent(held, { ...same, [key]: read("changed") } as unknown as StageOneReads),
			).toBe(false)
		}
	})

	test("takes the full read when a kept Read failed with a retryable code", () => {
		for (const code of ["database_busy", "disk_full", "traj_unavailable"]) {
			expect(stillCurrent(holding({ doctor: failed(code) }), same)).toBe(false)
			expect(stillCurrent(holding({ projections: { hand: failed(code) } }), same)).toBe(false)
		}
	})

	test("keeps the Snapshot when a kept Read failed with a permanent code", () => {
		expect(stillCurrent(holding({ doctor: failed("not_found") }), same)).toBe(true)
	})

	test("ignores a failed allowance read, which a reread runs again anyway", () => {
		expect(stillCurrent(holding({ allowances: { hand: failed("database_busy") } }), same)).toBe(
			true,
		)
	})
})

describe("stillCurrent with the paths", () => {
	test("ignores a failed chance read and a failed path read, which a chance reread runs again anyway", () => {
		const snapshot = holding({
			chance: { hand: failed("database_busy") },
			paths: { hand: { "3": failed("database_busy") } },
		})
		expect(stillCurrent(snapshot, same, ["chance"])).toBe(true)
		expect(stillCurrent(snapshot, same, ["allowances"])).toBe(false)
	})
})

describe("withChance", () => {
	test("swaps the chance inputs, the chance reads and the paths, and keeps every other Read", () => {
		const chance = { returnModel: "plan", paths: 10, seed: "0123456789abcdef" }
		const next = withChance(held, chance, {}, {
			hand: { "1": read("p") },
		} as unknown as Snapshot["reads"]["paths"])
		expect(next.params.chance).toEqual({ source: "plan", paths: 10, seed: "0123456789abcdef" })
		expect(next.reads.paths as unknown).toEqual({ hand: { "1": read("p") } })
		expect(next.reads.doctor).toBe(held.reads.doctor)
	})
})

describe("withAllowances", () => {
	test("swaps the inputs and the allowance reads and keeps every other field", () => {
		const inputs = { labels: ["allowance.thai_esg"], step: "1000", budget: null, minSaving: null }
		const next = withAllowances(held, inputs, {
			hand: read("e"),
		} as unknown as Snapshot["reads"]["allowances"])
		expect(next.params).toEqual({ ...held.params, allowances: inputs })
		expect(next.reads.allowances as unknown).toEqual({ hand: read("e") })
		expect(next.reads.doctor).toBe(held.reads.doctor)
		expect(next.cliVersion).toBe(held.cliVersion)
		expect(held.params.allowances).toBeNull()
	})
})
