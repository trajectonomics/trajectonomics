import { describe, expect, it } from "bun:test"
import { ESTATE_COST_BASES, ESTATE_GIFT_BASES } from "./estate-terms"
import { scenarioExample } from "./index"
import { nodeAt, probed, refusalsOf, VERSION } from "./testing"

/*
 * The closed sets and the refusals an estate line states (sim ADR 0025, cli ADR-0064): its rounding,
 * the base of a cost and of a gift, a share outside 0..10000, a liability as a base, and a repeated
 * id. They are probed against the pinned core, as every other closed set is in enums.test.ts, which
 * leaves `estate.*` to this file.
 */

const CASH = { id: "cash", kind: "asset", rate: 0 }
const LOAN = { id: "loan", kind: "liability", rate: 0 }

/** A Scenario whose estate block is `estate`, with the two Accounts the lines may name. */
function estateDocument(estate: Record<string, unknown>): Record<string, unknown> {
	return {
		...scenarioExample(VERSION ?? 0),
		accounts: [CASH, LOAN],
		flows: [],
		cashflow: { surplus: [{ account: "cash" }], contribute: [], withdraw: ["cash"] },
		estate,
	}
}

const COST = { id: "settlement", of: "gross", bps: 100, rounding: "floor" }
const GIFT = { id: "temple", of: "net", bps: 500, rounding: "floor" }

describe("the rounding an estate line states", () => {
	for (const list of ["costs", "gifts"] as const) {
		const line = list === "costs" ? COST : GIFT

		it(`states every rounding the core accepts for ${list}, and only those`, () => {
			const values = nodeAt(["estate", list, "*", "rounding"])["enum"] as string[]
			expect(values.length).toBeGreaterThan(0)
			for (const rounding of values) {
				expect(refusalsOf(estateDocument({ [list]: [{ ...line, rounding }] }))).toEqual([])
			}
		})

		it(`refuses a rounding outside the set, and a share with none, in ${list}, at that field`, () => {
			const path = probed(["estate", list, 0, "rounding"])
			expect(
				refusalsOf(estateDocument({ [list]: [{ ...line, rounding: "down" }] })),
			).toContainEqual({
				code: "INVALID_ROUNDING",
				path,
			})
			const { rounding: _omitted, ...bare } = line
			expect(refusalsOf(estateDocument({ [list]: [bare] }))).toContainEqual({
				code: "MISSING_KEY",
				path,
			})
		})
	}
})

describe("the base an estate share states", () => {
	it("states the word each list accepts, read from the core, and the Accounts form for a cost", () => {
		expect(ESTATE_COST_BASES).toEqual(["gross"])
		expect(ESTATE_GIFT_BASES).toEqual(["net"])
		const accounts = { accounts: ["cash"] }
		expect(refusalsOf(estateDocument({ costs: [{ ...COST, of: accounts }] }))).toEqual([])
	})

	it("refuses a base outside the set, in each list, at that field", () => {
		expect(refusalsOf(estateDocument({ costs: [{ ...COST, of: "net" }] }))).toContainEqual({
			code: "INVALID_BASIS",
			path: probed(["estate", "costs", 0, "of"]),
		})
		expect(refusalsOf(estateDocument({ gifts: [{ ...GIFT, of: "gross" }] }))).toContainEqual({
			code: "INVALID_BASIS",
			path: probed(["estate", "gifts", 0, "of"]),
		})
	})

	it("refuses an unknown Account and a liability in a cost's Accounts, at the Account", () => {
		const at = (name: string) => estateDocument({ costs: [{ ...COST, of: { accounts: [name] } }] })
		const path = probed(["estate", "costs", 0, "of", "accounts", 0])
		expect(refusalsOf(at("nowhere"))).toContainEqual({ code: "UNKNOWN_ACCOUNT", path })
		expect(refusalsOf(at("loan"))).toContainEqual({ code: "ESTATE_ACCOUNT_LIABILITY", path })
	})
})

describe("the shares and ids of an estate block", () => {
	it("refuses a share above 100% and a negative one, at the share", () => {
		for (const bps of [10_001, -1]) {
			expect(refusalsOf(estateDocument({ costs: [{ ...COST, bps }] }))).toContainEqual({
				code: "RATE_OUT_OF_RANGE",
				path: probed(["estate", "costs", 0, "bps"]),
			})
		}
		expect(refusalsOf(estateDocument({ costs: [{ ...COST, bps: 10_000 }] }))).toEqual([])
	})

	it("refuses an id repeated across the costs and the gifts, at the repeat", () => {
		const document = estateDocument({ costs: [COST], gifts: [{ ...GIFT, id: "settlement" }] })
		expect(refusalsOf(document)).toContainEqual({
			code: "DUPLICATE_ID",
			path: probed(["estate", "gifts", 0, "id"]),
		})
	})

	it("accepts an empty list, refuses an empty list of Accounts, and refuses a negative fixed amount", () => {
		expect(refusalsOf(estateDocument({ costs: [], gifts: [] }))).toEqual([])
		const none = estateDocument({ costs: [{ ...COST, of: { accounts: [] } }] })
		expect(refusalsOf(none)).toContainEqual({
			code: "MISSING_KEY",
			path: probed(["estate", "costs", 0, "of", "accounts"]),
		})
		const fixed = { id: "fee", amount: -1, growth: { bps: 0 } }
		expect(refusalsOf(estateDocument({ costs: [fixed] }))).toContainEqual({
			code: "NEGATIVE_AMOUNT",
			path: probed(["estate", "costs", 0, "amount"]),
		})
	})
})
