import { describe, expect, it } from "bun:test"
import { expense } from "../engine/test-flows"
import { makeFixture } from "../engine/test-helpers"
import type { Fixture } from "../fixtures/fixture"
import { chanceOfSuccess } from "../index"
import type { ChanceBand, ReturnModel } from "../types"

const SEED = "0000000000000000"
const FULL = 4294967296
const HALF = 2147483648
const LEVELS = [10, 25, 50, 75, 90]

/** Every Percentile level holds the same value, as it does when every path agrees. */
function uniform(index: number, to: string, value: number): ChanceBand {
	return { index, to, netWorth: LEVELS.map((level) => ({ level, value })) }
}

const flat: ReturnModel = {
	id: "flat",
	accounts: ["cash"],
	buckets: [{ returnsBps: [0], weight: FULL }],
}

const crash: ReturnModel = {
	id: "crash",
	accounts: ["cash"],
	buckets: [{ returnsBps: [-9999], weight: FULL }],
}

/** Seed 0's January draws: path 0 takes the flat bucket, path 1 the crash, path 2 the flat. */
const twoWay: ReturnModel = {
	id: "two-way",
	accounts: ["cash"],
	buckets: [
		{ returnsBps: [0], weight: HALF },
		{ returnsBps: [-9999], weight: HALF },
	],
}

/** The vault doubles each month; nothing withdraws from it, so it is pinned at death. */
const vaultDoubles: ReturnModel = {
	id: "vault-doubles",
	accounts: ["cash", "vault"],
	buckets: [{ returnsBps: [-9999, 10000], weight: FULL }],
}

const keep: Fixture = makeFixture({
	accounts: [{ id: "cash", kind: "asset", rate: 0 }],
	balances: { cash: 10_000_000 },
	surplus: [{ account: "cash" }],
	withdraw: ["cash"],
	horizon: "2026-12-31",
	resolution: "month",
})

/** A 60,000 bill on Jan 15 against 100,000: a flat January covers it, a crashed one cannot. */
const bill: Fixture = makeFixture({
	accounts: [{ id: "cash", kind: "asset", rate: 0 }],
	balances: { cash: 100_000 },
	flows: [expense("bill", 60_000, { start: "2026-01-15" })],
	surplus: [{ account: "cash" }],
	withdraw: ["cash"],
	horizon: "2026-01-31",
	resolution: "month",
})

/** Cash of 500 crashes to 0 by Feb 1, so the 100 bill on Feb 1 runs out with 2,000 in the vault. */
const vault: Fixture = makeFixture({
	accounts: [
		{ id: "cash", kind: "asset", rate: 0 },
		{ id: "vault", kind: "asset", rate: 0 },
	],
	balances: { cash: 500, vault: 1_000 },
	flows: [expense("bill", 100, { start: "2026-02-01" })],
	surplus: [{ account: "cash" }],
	withdraw: ["cash"],
	horizon: "2027-12-31",
	resolution: "month",
})

function chance(fixture: Fixture, model: ReturnModel, seed: string, paths: number) {
	return chanceOfSuccess(fixture.baseline, fixture.scenario, fixture.timeline, {
		model,
		seed,
		paths,
	})
}

describe("chanceOfSuccess", () => {
	it("succeeds on every path of a flat market and reports the opening balance at year end", () => {
		expect(chance(keep, flat, SEED, 3)).toEqual({
			ok: true,
			chance: {
				definition: { modelId: "flat", seed: SEED, paths: 3 },
				paths: 3,
				succeeded: 3,
				successBps: 10000,
				bands: [uniform(0, "2026-12-31", 10_000_000)],
				runsOut: [{ index: 0, to: "2026-12-31", paths: 0 }],
			},
		})
	})

	it("counts a crashed path as a failure and pins its net worth at zero when cash runs out", () => {
		expect(chance(bill, crash, SEED, 2)).toEqual({
			ok: true,
			chance: {
				definition: { modelId: "crash", seed: SEED, paths: 2 },
				paths: 2,
				succeeded: 0,
				successBps: 0,
				bands: [uniform(0, "2026-01-31", 0)],
				runsOut: [{ index: 0, to: "2026-01-31", paths: 2 }],
			},
		})
	})

	it("pins a failed path at the net worth it died with, un-grown, in every later roll-up", () => {
		expect(chance(vault, vaultDoubles, SEED, 2)).toEqual({
			ok: true,
			chance: {
				definition: { modelId: "vault-doubles", seed: SEED, paths: 2 },
				paths: 2,
				succeeded: 0,
				successBps: 0,
				bands: [uniform(0, "2026-12-31", 2000), uniform(1, "2027-12-31", 2000)],
				runsOut: [
					{ index: 0, to: "2026-12-31", paths: 2 },
					{ index: 1, to: "2027-12-31", paths: 0 },
				],
			},
		})
	})

	it("takes the flat path's January draw as a success and the crash path's as the failure", () => {
		expect(chance(bill, twoWay, SEED, 2)).toMatchObject({
			ok: true,
			chance: {
				succeeded: 1,
				successBps: 5000,
				bands: [
					{
						index: 0,
						to: "2026-01-31",
						netWorth: [
							{ level: 10, value: 0 },
							{ level: 25, value: 0 },
							{ level: 50, value: 0 },
							{ level: 75, value: 40000 },
							{ level: 90, value: 40000 },
						],
					},
				],
				runsOut: [{ index: 0, to: "2026-01-31", paths: 1 }],
			},
		})
	})

	it("changes the draw with the seed but not the rule: seed 0 survives and seed 2 crashes", () => {
		const survives = chance(bill, twoWay, SEED, 1)
		const crashes = chance(bill, twoWay, "0000000000000002", 1)
		expect(survives).toMatchObject({ ok: true, chance: { successBps: 10000 } })
		expect(crashes).toMatchObject({
			ok: true,
			chance: { successBps: 0, runsOut: [{ index: 0, to: "2026-01-31", paths: 1 }] },
		})
	})

	it("keeps an earlier path's draw when more paths are added, and floors the share", () => {
		// Path 0 of seed 0 is the flat draw in both runs; paths 0 and 2 survive out of three.
		expect(chance(bill, twoWay, SEED, 3)).toMatchObject({
			ok: true,
			chance: {
				succeeded: 2,
				successBps: 6666,
				bands: [
					{
						index: 0,
						to: "2026-01-31",
						netWorth: [
							{ level: 10, value: 0 },
							{ level: 25, value: 0 },
							{ level: 50, value: 40000 },
							{ level: 75, value: 40000 },
							{ level: 90, value: 40000 },
						],
					},
				],
			},
		})
	})
})
