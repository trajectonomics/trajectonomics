import { describe, expect, it } from "bun:test"
import { ROUTING_CASHFLOW, TRANSFER_FLOW } from "./example-routing"
import { scenarioExample } from "./index"
import { nodeAt, refusalsOf, VERSION } from "./testing"

/*
 * The routing forms and the transfer Flow the shape states (cli ADR-0070), proved against the pinned core: each
 * form the schema describes is one the core accepts, each object it closes is closed, each key it requires is
 * refused when missing, and each claim a description makes about a refusal is the code the core uses. The
 * generic walkers in `structure.test.ts` and `required.test.ts` read `properties` and `items` only, so the
 * `anyOf` forms are probed here.
 */

const ACCOUNTS = [
	{ id: "cash", kind: "asset", rate: 0 },
	{ id: "emergency", kind: "asset", rate: 0 },
	{ id: "index", kind: "asset", rate: 600 },
	{ id: "pvd", kind: "asset", rate: 300 },
	{ id: "rmf", kind: "asset", rate: 400, lockedUntil: "2040-01-01" },
	{ id: "debt", kind: "liability", rate: 0 },
]

/** A Scenario over those Accounts with `cashflow` and `flows` as given. */
function documentOf(cashflow: unknown, flows: unknown[] = []): Record<string, unknown> {
	const { milestones: _milestones, ...example } = scenarioExample(VERSION ?? 0)
	return {
		...example,
		estate: {},
		accounts: ACCOUNTS,
		flows,
		cashflow,
	}
}

const route = (surplus: unknown[], withdraw: unknown[] = ["cash"]) =>
	documentOf({ surplus, contribute: [], withdraw })

const GROWN = { amount: 100_000, growth: "inflation" }

describe("the routing forms the shape states", () => {
	it("accepts the worked routing and the worked transfer", () => {
		expect(refusalsOf(documentOf(ROUTING_CASHFLOW))).toEqual([])
		expect(
			refusalsOf(
				documentOf({ surplus: [{ account: "cash" }], contribute: [], withdraw: [] }, [
					TRANSFER_FLOW,
				]),
			),
		).toEqual([])
	})

	it("states a target as a whole number or { amount, growth }, and a step's share as 1 to 10000 basis points", () => {
		const upTo = nodeAt(["cashflow", "surplus", 0, "upTo"])
		expect((upTo["anyOf"] as { type?: string }[]).map((branch) => branch.type)).toEqual([
			"integer",
			"object",
		])
		const share = nodeAt(["cashflow", "surplus", 0, "share"])
		expect([share["minimum"], share["maximum"]]).toEqual([1, 10_000])
		const entry = nodeAt(["cashflow", "withdraw", 0])
		expect((entry["anyOf"] as { type?: string }[]).map((branch) => branch.type)).toEqual([
			"string",
			"object",
		])
	})

	it("takes either growth form in a target, and refuses any other", () => {
		for (const growth of ["inflation", { bps: 250 }, { bps: -50 }]) {
			const surplus = [{ account: "cash", upTo: { amount: 1, growth } }, { account: "index" }]
			expect(refusalsOf(route(surplus))).toEqual([])
		}
		const surplus = [
			{ account: "cash", upTo: { amount: 1, growth: "sometimes" } },
			{ account: "index" },
		]
		expect(refusalsOf(route(surplus))).toContainEqual({
			code: "INVALID_GROWTH",
			path: "cashflow.surplus.0.upTo.growth",
		})
	})

	it("closes the target object and the floor entry, and requires their keys", () => {
		const grown = (extra: object) =>
			route([{ account: "cash", upTo: { ...GROWN, ...extra } }, { account: "index" }])
		expect(refusalsOf(grown({ noSuchKey: 1 }))).toContainEqual({
			code: "UNKNOWN_KEY",
			path: "cashflow.surplus.0.upTo.noSuchKey",
		})
		for (const key of ["amount", "growth"]) {
			const { [key]: _gone, ...rest } = GROWN as Record<string, unknown>
			expect(
				refusalsOf(route([{ account: "cash", upTo: rest }, { account: "index" }])),
			).toContainEqual({
				code: "MISSING_KEY",
				path: `cashflow.surplus.0.upTo.${key}`,
			})
		}
		expect(
			refusalsOf(route([{ account: "cash" }], [{ account: "cash", downTo: 1, noSuchKey: 1 }])),
		).toContainEqual({
			code: "UNKNOWN_KEY",
			path: "cashflow.withdraw.0.noSuchKey",
		})
		expect(refusalsOf(route([{ account: "cash" }], [{ account: "cash" }]))).toContainEqual({
			code: "MISSING_KEY",
			path: "cashflow.withdraw.0.downTo",
		})
	})

	it("refuses a share outside 1 to 10000, and a share on the last step", () => {
		for (const share of [0, 10_001]) {
			expect(refusalsOf(route([{ account: "cash", share }, { account: "index" }]))).toContainEqual({
				code: "RATE_OUT_OF_RANGE",
				path: "cashflow.surplus.0.share",
			})
		}
		expect(
			refusalsOf(route([{ account: "cash" }, { account: "index", share: 5_000 }])),
		).toContainEqual({
			code: "SURPLUS_SHARE_LAST",
			path: "cashflow.surplus.1.share",
		})
	})

	it("refuses a floor after a plain entry of the same Account, and one that is not lower", () => {
		expect(
			refusalsOf(route([{ account: "cash" }], ["cash", { account: "cash", downTo: 1 }])),
		).toContainEqual({
			code: "WITHDRAW_FLOOR_ORDER",
			path: "cashflow.withdraw.1.downTo",
		})
		const same = [
			{ account: "cash", downTo: 5 },
			{ account: "cash", downTo: 5 },
		]
		expect(refusalsOf(route([{ account: "cash" }], same))).toContainEqual({
			code: "WITHDRAW_FLOOR_ORDER",
			path: "cashflow.withdraw.1.downTo",
		})
	})
})

describe("the transfer Flow the shape states", () => {
	const MOVE = {
		id: "move",
		kind: "transfer",
		source: "cash",
		target: "index",
		frequency: "monthly",
		start: "2026-01-01",
		amount: 1_000,
		growth: { bps: 0 },
	}
	const run = (flow: object) =>
		refusalsOf(
			documentOf({ surplus: [{ account: "cash" }], contribute: [], withdraw: [] }, [
				{ ...MOVE, ...flow },
			]),
		)

	it("takes a source, a target and a realise flag, and a liability or a locked Account as target", () => {
		expect(run({})).toEqual([])
		expect(run({ realise: true })).toEqual([])
		expect(run({ target: "rmf" })).toEqual([])
		expect(run({ target: "debt" })).toEqual([])
	})

	it("refuses the source and target its description rules out, at the key", () => {
		expect(run({ source: "debt", target: "cash" })).toContainEqual({
			code: "TRANSFER_FROM_LIABILITY",
			path: "flows.0.source",
		})
		expect(run({ target: "cash" })).toContainEqual({
			code: "TRANSFER_SAME_ACCOUNT",
			path: "flows.0.target",
		})
	})

	it("refuses the keys it says a transfer does not take", () => {
		expect(run({ funding: "obligation" })).toContainEqual({
			code: "FIELD_NOT_ALLOWED",
			path: "flows.0.funding",
		})
		expect(
			run({ amount: undefined, growth: undefined, rule: { kind: "initialRate" } }).map(
				(r) => r.path,
			),
		).toContain("flows.0.rule")
	})
})
