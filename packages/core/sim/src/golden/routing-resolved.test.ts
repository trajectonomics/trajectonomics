import { describe, expect, it } from "bun:test"
import { routedAt } from "../engine/routed"
import { createStates } from "../engine/state"
import type { Fixture } from "../fixtures/fixture"
import { routedTargetAt } from "../index"
import type { Projection, RoutedAmount } from "../types"
import { oracleAddDays } from "./oracle-date"
import { oracleStatement } from "./oracle-routing-statement"
import {
	floorStopsDraw,
	floorThenFunds,
	lockedFloor,
	realFloor,
	realTarget,
	shareCapped,
	shareThenRest,
	topUpThenShare,
} from "./routing-cases"
import { projectedOf } from "./routing-projected"
import { routingStatement } from "./routing-statement-case"

const EIGHT: readonly (readonly [string, Fixture])[] = [
	["routing-share-then-rest", shareThenRest],
	["routing-share-capped", shareCapped],
	["routing-top-up-then-share", topUpThenShare],
	["routing-floor-then-funds", floorThenFunds],
	["routing-floor-stops-draw", floorStopsDraw],
	["routing-locked-floor", lockedFloor],
	["routing-real-floor", realFloor],
	["routing-real-target", realTarget],
]

function targetsOf({ scenario }: Fixture): readonly RoutedAmount[] {
	const found: RoutedAmount[] = []
	for (const step of scenario.cashflow.surplus) if (step.upTo !== undefined) found.push(step.upTo)
	for (const entry of scenario.cashflow.withdraw) {
		if (typeof entry !== "string") found.push(entry.downTo)
	}
	return found
}

describe("the resolver equals the engine's own figure on every date", () => {
	for (const [name, fixture] of EIGHT) {
		it(`${name}: every day from the Timeline start to the horizon`, () => {
			const { baseline, scenario, timeline } = fixture
			const state = [...createStates(baseline, scenario, timeline.start).values()][0]!
			const { inflation } = scenario.economy
			let days = 0
			for (let date = timeline.start; date <= timeline.horizon; date = oracleAddDays(date, 1)) {
				for (const target of targetsOf(fixture)) {
					const internal = routedAt(target, state, date, inflation)
					expect(routedTargetAt(target, timeline.start, date, inflation)).toBe(Number(internal))
				}
				days++
			}
			expect(days).toBeGreaterThan(50)
		})
	}
})

describe("the Projection states each target in force", () => {
	for (const [name, fixture] of [...EIGHT, ["routing-statement", routingStatement] as const]) {
		it(`${name}: agrees with the oracle, or is absent when no target is grown`, () => {
			const { routing } = projectedOf(fixture)
			const grown = targetsOf(fixture).some((target) => typeof target === "object")
			if (!grown) return expect(routing).toBeUndefined()
			const { scenario, timeline } = fixture
			const oracle = oracleStatement(scenario, timeline.start, timeline.horizon)
			const number = (value: bigint) => Number(value)
			const stated = (resolved: { first: bigint; horizon: bigint } | null) =>
				resolved === null
					? null
					: { first: number(resolved.first), horizon: number(resolved.horizon) }
			expect(routing!.surplus.map((item) => item.upTo)).toEqual(oracle.surplus.map(stated))
			expect(routing!.withdraw.map((item) => item.downTo)).toEqual(oracle.withdraw.map(stated))
			expect(routing!.surplus.map((item) => item.entry)).toEqual(oracle.surplus.map((_, at) => at))
			expect(routing!.withdraw.map((item) => item.entry)).toEqual(
				oracle.withdraw.map((_, at) => at),
			)
		})
	}
})

describe("what the field says, worked by hand (ADR 0030)", () => {
	it("a floor of 300,000 at 3% is 300,000 at the start and 347,782 on 1 March 2031", () => {
		expect(projectedOf(realFloor).routing).toEqual({
			surplus: [{ entry: 0, upTo: null }],
			withdraw: [{ entry: 0, downTo: { first: 300_000, horizon: 347_782 } }],
		} satisfies Projection["routing"])
	})

	it("an upTo of 1,000,000 is 1,000,000 at the start and 1,159,274 at the horizon", () => {
		expect(projectedOf(realTarget).routing).toEqual({
			surplus: [
				{ entry: 0, upTo: { first: 1_000_000, horizon: 1_159_274 } },
				{ entry: 1, upTo: null },
			],
			withdraw: [{ entry: 0, downTo: null }],
		} satisfies Projection["routing"])
	})

	it("from 29 February 2028 three anniversaries make 1,092,727, a nominal target is itself, a -100 bps floor is 291,090", () => {
		expect(projectedOf(routingStatement).routing).toEqual({
			surplus: [
				{ entry: 0, upTo: { first: 1_000_000, horizon: 1_092_727 } },
				{ entry: 1, upTo: { first: 250_000, horizon: 250_000 } },
				{ entry: 2, upTo: null },
			],
			withdraw: [
				{ entry: 0, downTo: { first: 300_000, horizon: 291_090 } },
				{ entry: 1, downTo: { first: 50_000, horizon: 50_000 } },
				{ entry: 2, downTo: null },
			],
		} satisfies Projection["routing"])
	})
})
