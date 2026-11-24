import { describe, expect, it } from "bun:test"
import { project } from "../engine/project"
import { income } from "../engine/test-flows"
import { makeFixture } from "../engine/test-helpers"
import type { Fixture } from "../fixtures/fixture"
import type { Account } from "../types"
import { routingStatement } from "./routing-statement-case"

const account = (id: string): Account => ({ id, kind: "asset", rate: 0 })

/** An `upTo` of 9e15 in today's money: 3 per cent a year makes it 9,270,000,000,000,000 once the year turns, past 2^53. */
const overflowing: Fixture = makeFixture({
	accounts: [account("cash"), account("invest")],
	balances: {},
	flows: [income("pay", 100_000, { start: "2026-02-01" })],
	surplus: [
		{ account: "invest", upTo: { amount: 9e15, growth: "inflation" } },
		{ account: "cash" },
	],
	withdraw: ["cash"],
	inflation: 300,
	start: "2026-01-01",
	horizon: "2028-06-30",
	resolution: "month",
})

const run = (fixture: Fixture, options: Parameters<typeof project>[3]) =>
	project(fixture.baseline, fixture.scenario, fixture.timeline, options)

describe("the routing statement is opt-in (ADR 0030)", () => {
	it("a target the engine only subtracts does not fail a run that never asked to report it", () => {
		expect(run(overflowing, {}).ok).toBe(true)
		expect(run(overflowing, { cashflowBreakdown: true, estate: true }).ok).toBe(true)
	})

	it("with the option, the target beyond 2^53 is a VALUE_OVERFLOW on the horizon date", () => {
		expect(run(overflowing, { routing: true })).toEqual({
			ok: false,
			problems: [{ code: "VALUE_OVERFLOW", date: "2028-06-30" }],
		})
	})

	it("without the option a Projection has no routing key; with it, the statement", () => {
		const { baseline, scenario, timeline } = routingStatement
		const plain = project(baseline, scenario, timeline)
		const stated = project(baseline, scenario, timeline, { routing: true })
		if (!plain.ok || !stated.ok) throw new Error("projection failed")
		expect("routing" in plain.projection).toBe(false)
		const { routing, ...rest } = stated.projection
		expect(routing).toBeDefined()
		expect(rest).toEqual(plain.projection)
	})
})
