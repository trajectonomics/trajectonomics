import { describe, expect, it } from "bun:test"
import { mutate } from "../engine/mutate"
import { project } from "../engine/project"
import { resolveReturns } from "../engine/return-rows"
import type { ReturnSeries, Returns } from "../engine/returns"
import { runEngine } from "../engine/run"
import { createStates } from "../engine/state"
import { valuation } from "../engine/value"
import type { Fixture } from "../fixtures/fixture"
import { buildProjection } from "../output/build"
import { periodEndDates } from "../output/periods"
import { rowDates } from "../output/row-dates"
import type { DateString, Timeline } from "../types"
import type { Projection } from "../types/projection"
import { oracleResolveRows, oracleSpanGrow } from "./oracle-returns"
import { oracleChangedValue } from "./oracle-returns-changes"
import { handRows, handRowsReturns } from "./return-cases"
import { zeroRateFixture, zeroRateReturns } from "./zero-rate-cases"

const HAND = handRowsReturns.series[0] as ReturnSeries
const ROWS = oracleResolveRows(HAND.rows, handRows.timeline.horizon)

function engineValue(fixture: Fixture, input: Returns): bigint {
	const states = createStates(
		fixture.baseline,
		fixture.scenario,
		fixture.timeline.start,
		resolveReturns(input, fixture.timeline),
	)
	return valuation(states.get("cash")!, fixture.timeline.horizon)
}

function observations(timeline: Timeline): readonly DateString[] {
	return [...rowDates(timeline), ...periodEndDates(timeline.start, timeline.horizon)]
}

function seriesProjection(fixture: Fixture, returns: Returns): Projection {
	const run = runEngine(
		fixture.baseline,
		fixture.scenario,
		fixture.timeline,
		observations(fixture.timeline),
		returns,
	)
	if (!run.ok) throw new Error(JSON.stringify(run.problem))
	const built = buildProjection(run.run, fixture.baseline, fixture.scenario, fixture.timeline)
	if ("problem" in built) throw new Error(JSON.stringify(built.problem))
	return built.projection
}

describe("the oracle's row walk", () => {
	it("matches the hand-computed values", () => {
		// 100,000 × (10,000×180 + 1,000×90) / (10,000×180) = 105,000
		expect(oracleSpanGrow(100000n, "2023-01-01", "2023-04-01", ROWS)).toBe(105000n)
		// 100,000 × 11,000 / 10,000 = 110,000
		expect(oracleSpanGrow(100000n, "2023-01-01", "2023-06-30", ROWS)).toBe(110000n)
		// 110,000 × 10,800 / 10,000 = 118,800
		expect(oracleSpanGrow(100000n, "2023-01-01", "2024-01-01", ROWS)).toBe(118800n)
	})

	it("reproduces the engine at every month start", () => {
		expect(engineValue(handRows, handRowsReturns)).toBe(118800n)
		const states = createStates(
			handRows.baseline,
			handRows.scenario,
			handRows.timeline.start,
			resolveReturns(handRowsReturns, handRows.timeline),
		)
		for (let month = 0; month <= 12; month++) {
			const date = `2023-${String(month === 0 ? 1 : month).padStart(2, "0")}-01`
			expect(valuation(states.get("cash")!, date)).toBe(
				oracleSpanGrow(100000n, "2023-01-01", date, ROWS),
			)
		}
	})

	it("settles a row split at its midpoint to the same 110,000", () => {
		const rows = (delta: bigint) => [{ date: "2023-04-01", delta }]
		expect(oracleChangedValue(100000n, "2023-01-01", rows(0n), "2023-06-30", ROWS)).toBe(110000n)
		// 100,000 × 1.1 + 10,000 × (1 + 10% × 90/180)
		expect(oracleChangedValue(100000n, "2023-01-01", rows(10000n), "2023-06-30", ROWS)).toBe(
			120500n,
		)
		expect(oracleChangedValue(100000n, "2023-01-01", rows(-10000n), "2023-06-30", ROWS)).toBe(
			99500n,
		)
	})

	it("agrees with the engine on changes inside both rows", () => {
		const changes = [
			{ date: "2023-04-01", delta: 10000n },
			{ date: "2023-09-01", delta: -20000n },
		]
		const state = createStates(
			handRows.baseline,
			handRows.scenario,
			handRows.timeline.start,
			resolveReturns(handRowsReturns, handRows.timeline),
		).get("cash")!
		for (const change of changes) mutate(state, change.date, change.delta, undefined)
		const oracle = oracleChangedValue(100000n, "2023-01-01", changes, "2024-01-01", ROWS)
		expect(valuation(state, "2024-01-01")).toBe(oracle)
		expect(oracle).toBe(109085n)
	})
})

describe("a Return series over an all-zero-rate fixture", () => {
	it("reproduces project() on the same fixture", () => {
		const expected = project(
			zeroRateFixture.baseline,
			zeroRateFixture.scenario,
			zeroRateFixture.timeline,
		)
		if (!expected.ok) throw new Error(JSON.stringify(expected.problems))
		expect(seriesProjection(zeroRateFixture, zeroRateReturns)).toEqual(expected.projection)
	})

	it("keeps the Shortfall the fixture was built for", () => {
		const built = seriesProjection(zeroRateFixture, zeroRateReturns)
		expect(built.runsOut?.date).toBe("2026-12-31")
		expect(built.runsOut?.unmet).toBeGreaterThan(0)
	})
})
