import { describe, expect, it } from "bun:test"
import { scenarioExample } from "./index"
import { nodeAt, probed, refusalsOf, VERSION } from "./testing"

/*
 * The closed sets and refusals an Account's payout and fee state (sim ADR 0027, ADR 0028, cli
 * ADR-0067): the payout's frequency and rounding, the fee's rounding, a share outside 0 to 10000 and
 * a rounding left out. They are probed against the pinned core, as every other closed set is in
 * enums.test.ts, which leaves `accounts.*.payout` and `accounts.*.fee` to this file.
 */

const PAYOUT = { bps: 350, frequency: "quarterly", rounding: "floor" }
const FEE = { bps: 150, rounding: "floor" }

/** A Scenario with one asset Account that carries `patch`. */
function accountDocument(patch: Record<string, unknown>): Record<string, unknown> {
	return {
		...scenarioExample(VERSION ?? 0),
		estate: {},
		accounts: [{ id: "fund", kind: "asset", rate: 500, ...patch }],
		flows: [],
		cashflow: { surplus: [{ account: "fund" }], contribute: [], withdraw: [] },
	}
}

/** The two keys a payout and a fee close over, and where each is documented. */
const SETS = [
	{ key: "payout", leaf: "frequency", values: ["monthly", "quarterly", "semiannual", "annual"] },
	{ key: "payout", leaf: "rounding", values: ["floor", "halfUp", "ceil"] },
	{ key: "fee", leaf: "rounding", values: ["floor", "halfUp", "ceil"] },
] as const

describe("the closed sets a payout and a fee state", () => {
	for (const { key, leaf, values } of SETS) {
		const base = key === "payout" ? PAYOUT : FEE
		const path = ["accounts", "*", key, leaf]

		it(`states every ${key} ${leaf} the core accepts, and only those`, () => {
			const stated = nodeAt(path)["enum"] as string[]
			expect([...stated].sort()).toEqual([...values].sort())
			for (const value of stated) {
				expect(refusalsOf(accountDocument({ [key]: { ...base, [leaf]: value } })), value).toEqual(
					[],
				)
			}
		})

		it(`refuses a ${key} ${leaf} outside the set, at that field`, () => {
			const code = leaf === "frequency" ? "INVALID_FREQUENCY" : "INVALID_ROUNDING"
			expect(refusalsOf(accountDocument({ [key]: { ...base, [leaf]: "hourly" } }))).toContainEqual({
				code,
				path: probed(["accounts", 0, key, leaf]),
			})
		})
	}

	it("refuses a rounding left out, since there is no default", () => {
		for (const [key, base] of [
			["payout", PAYOUT],
			["fee", FEE],
		] as const) {
			const { rounding: _omitted, ...bare } = base
			expect(refusalsOf(accountDocument({ [key]: bare }))).toContainEqual({
				code: "MISSING_KEY",
				path: `accounts.0.${key}.rounding`,
			})
		}
	})

	it("refuses a share above 10000 basis points, at its field", () => {
		for (const [key, base] of [
			["payout", PAYOUT],
			["fee", FEE],
		] as const) {
			expect(refusalsOf(accountDocument({ [key]: { ...base, bps: 10_001 } }))).toContainEqual({
				code: "RATE_OUT_OF_RANGE",
				path: `accounts.0.${key}.bps`,
			})
		}
	})

	it("accepts a share of 0 basis points, which is none", () => {
		expect(refusalsOf(accountDocument({ payout: { ...PAYOUT, bps: 0 } }))).toEqual([])
		expect(refusalsOf(accountDocument({ fee: { ...FEE, bps: 0 } }))).toEqual([])
	})
})
