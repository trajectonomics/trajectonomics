import { describe, expect, it } from "bun:test"
import type { Scenario } from "@trajectonomics/core/sim"
import { fi, projection } from "./projection/testing"
import { ROUTING_FLAGS, ROUTING_PLAN, routingHome } from "./projection-routing-plan"
import { runBody } from "./projection-run-support"
import { capture } from "./test-support"

/*
 * What a grown target is worth at the start and at the horizon, as `projection run`'s `routing` echo states it
 * (cli ADR-0070, sim ADR-0030). Every figure is the engine's: the 300,000 floor at 3% inflation is 337,653 after four
 * whole years and 347,782 from the fifth anniversary (sim ADR-0030), in minor units.
 */

/** The routing plan with the surplus and the withdrawal lists replaced; the Flows are the plan's own. */
function planWith(cashflow: Partial<Scenario["cashflow"]>): Scenario {
	return { ...ROUTING_PLAN, cashflow: { ...ROUTING_PLAN.cashflow, ...cashflow } }
}

const FLOOR_PLAN = planWith({
	surplus: [{ account: "emergency", upTo: 50_000 }, { account: "cash" }],
	withdraw: [{ account: "emergency", downTo: { amount: 300_000, growth: "inflation" } }, "funds"],
})

/** The routing plan's flags with the horizon moved to `horizon`. */
const until = (horizon: string): string[] => [...ROUTING_FLAGS.slice(0, -1), horizon]

const echoOn = async (document: Scenario, horizon: string) => {
	const res = await projection(await routingHome(document), ["run", ...until(horizon)])
	expect(res.err).toBe("")
	expect(res.code).toBe(0)
	return runBody(res).routing
}

describe("the routing echo states what a grown target is worth", () => {
	it("is 337,653 after four whole years and 347,782 on the fifth anniversary, as the engine rounds them", async () => {
		const fourth = await echoOn(FLOOR_PLAN, "2030-12-31")
		expect(fourth?.withdraw[0]?.resolved).toEqual({ first: "3000.00", horizon: "3376.53" })
		const fifth = await echoOn(FLOOR_PLAN, "2031-01-01")
		expect(fifth?.withdraw[0]?.resolved).toEqual({ first: "3000.00", horizon: "3477.82" })
		// The document's own figures stay beside it.
		expect(fifth?.withdraw[0]?.downTo).toEqual({ amount: "3000.00", growth: "inflation" })
	})

	it("states a surplus step's `upTo` the same way", async () => {
		const grown = planWith({
			surplus: [
				{ account: "emergency", upTo: { amount: 1_000_000, growth: "inflation" } },
				{ account: "cash" },
			],
		})
		const echo = await echoOn(grown, "2031-01-01")
		expect(echo?.surplus[0]?.resolved).toEqual({ first: "10000.00", horizon: "11592.74" })
	})

	it("states no `resolved` for a nominal target, a step without a target or a plain Account", async () => {
		const echo = await echoOn(FLOOR_PLAN, "2031-01-01")
		expect(echo?.surplus[0]?.upTo).toEqual({ amount: "500.00", growth: null })
		for (const entry of [echo?.surplus[0], echo?.surplus[1], echo?.withdraw[1]]) {
			expect(entry).toBeDefined()
			expect(entry && "resolved" in entry).toBe(false)
		}
	})

	it("states no `resolved` anywhere when no target is grown, and the engine is not asked for it", async () => {
		const nominal = planWith({
			surplus: [
				{ account: "emergency", upTo: 50_000 },
				{ account: "funds", share: 5_000 },
				{ account: "cash" },
			],
			withdraw: [{ account: "emergency", downTo: 20_000 }, "funds"],
		})
		const res = await projection(await routingHome(nominal), ["run", ...until("2031-01-01")])
		expect(res.code).toBe(0)
		expect(res.out).not.toContain("resolved")
	})

	it("reads it in the human form beside the document's own figure", async () => {
		const home = await routingHome(FLOOR_PLAN)
		const res = await capture(["projection", "run", ...until("2031-01-01")], { TRAJ_HOME: home })
		expect(res.code).toBe(0)
		expect(res.out).toContain(
			"down to 3000.00 at the start, grown by inflation: 3477.82 at the horizon",
		)
		expect(res.out).toContain("up to 500.00\n")
	})
})

describe("a grown target past the largest amount", () => {
	const OVERFLOWING = planWith({
		surplus: [
			{ account: "emergency", upTo: { amount: 9_000_000_000_000_000, growth: "inflation" } },
			{ account: "cash" },
		],
	})

	it("still runs: the echo states no `resolved` and one note names the target it could not state", async () => {
		const res = await projection(await routingHome(OVERFLOWING), ["run", ...until("2027-01-01")])
		expect(res.err).toBe("")
		expect(res.code).toBe(0)
		const body = runBody(res)
		expect(body.routing?.surplus[0]?.upTo).toEqual({
			amount: "90000000000000.00",
			growth: "inflation",
		})
		for (const entry of [...(body.routing?.surplus ?? []), ...(body.routing?.withdraw ?? [])]) {
			expect("resolved" in entry).toBe(false)
		}
		expect(body.notes.filter((note) => note.includes("cannot be stated"))).toEqual([
			"What the target at cashflow.surplus[0].upTo is worth at the horizon, 2027-01-01, cannot be stated: grown by inflation, it passes the largest amount the engine holds. The plan still runs with it.",
		])
	})

	it("names a growth in basis points as the document does", async () => {
		const bps = planWith({
			surplus: [
				{ account: "emergency", upTo: { amount: 9_000_000_000_000_000, growth: { bps: 500 } } },
				{ account: "cash" },
			],
		})
		const body = runBody(await projection(await routingHome(bps), ["run", ...until("2027-01-01")]))
		expect(body.notes.join(" ")).toContain("grown by 500 bps a year, it passes")
	})

	it("is not asked of `fi`, which never states the routing: the same plan runs there too", async () => {
		const res = await fi(await routingHome(OVERFLOWING), until("2027-01-01"))
		expect(res.err).toBe("")
		expect(res.code).toBe(0)
	})
})
