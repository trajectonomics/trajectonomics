import { describe, expect, it } from "bun:test"
import { buildEvents } from "../engine/events"
import { project } from "../engine/project"
import { createStates } from "../engine/state"
import { derivedExpense } from "../engine/test-flows"
import { makeFixture } from "../engine/test-helpers"
import type { Account, Derive, Frequency } from "../types"
import { planViewOf } from "./gate-figures"
import { plannedExpenses } from "./planned-expenses"

/** 1 / 1,000 of the read Account's value, on each upkeep. */
const upkeep: Derive = {
	measures: [
		{ id: "value", op: "account", account: "read" },
		{ id: "share", op: "scale", of: "value", num: 1, den: 1000, rounding: "halfUp" },
	],
	result: "share",
}

const accounts: Record<string, Account> = {
	effective: { id: "read", kind: "asset", rate: 300 },
	nominal: { id: "read", kind: "asset", rate: 450, compounding: "monthly" },
	liability: { id: "read", kind: "liability", rate: 600, compounding: "monthly" },
}

/** A year's window from its 1 January, against the engine's roll-up of the same year. */
function yearsOf(rule: Account, frequency: Frequency): { window: bigint; rollup: bigint }[] {
	const fixture = makeFixture({
		accounts: [{ id: "cash", kind: "asset", rate: 0 }, rule],
		balances: { cash: 5_000_000_000, read: 700_000_000 },
		flows: [derivedExpense("upkeep", upkeep, { frequency, start: "2026-01-31" })],
		surplus: [{ account: "cash" }],
		withdraw: ["cash"],
		start: "2026-01-01",
		horizon: "2033-01-01",
		resolution: "month",
	})
	const { baseline, scenario, timeline } = fixture
	const result = project(baseline, scenario, timeline)
	if (!result.ok) throw new Error(JSON.stringify(result.problems))
	const events = buildEvents(scenario, timeline, undefined)
	const view = planViewOf(scenario, timeline, events)
	return result.projection.annual.slice(0, 7).map((year, index) => {
		const date = `${2026 + index}-01-01` as const
		const states = createStates(baseline, scenario, timeline.start)
		return {
			window: plannedExpenses(view, new Map(), date, "nominal", states) ?? -1n,
			rollup: BigInt(year.expense),
		}
	})
}

describe("a next-12-months window priced from each 1 January against the engine's annual roll-up", () => {
	// Upkeeps start on 31 January, so each month's lands on its last day (28 or 29 February) and a
	// 2028 leap day falls inside a window; the window and the roll-up must agree to the unit.
	for (const [name, rule] of Object.entries(accounts)) {
		for (const frequency of ["weekly", "monthly", "annual"] as const) {
			it(`${name} Account, ${frequency} upkeep: 2026 to 2032 agree, 2028 leap day included`, () => {
				const years = yearsOf(rule, frequency)
				expect(years).toHaveLength(7)
				for (const { window, rollup } of years) expect(window).toBe(rollup)
				expect(years.every(({ rollup }) => rollup > 0n)).toBe(true)
			})
		}
	}
})
