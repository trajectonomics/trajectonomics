import { describe, expect, test } from "bun:test"
import type { Snapshot } from "../contract"
import { stillCurrent, withAllowances } from "./reread"
import type { StageOneReads } from "./stage-one"

const read = (value: string) => ({ argv: ["x"], ok: true as const, data: { value } })
const held = {
	snapshotVersion: 1,
	params: { asOf: "2027-01-01", allowances: null },
	cliVersion: "test",
	reads: {
		scenarios: read("a"),
		accounts: read("b"),
		netWorth: read("c"),
		doctor: read("d"),
		allowances: {},
	},
} as unknown as Snapshot
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
