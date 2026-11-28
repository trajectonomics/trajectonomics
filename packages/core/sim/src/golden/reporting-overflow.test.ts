import { describe, expect, it } from "bun:test"
import { project } from "../engine/project"
import { expense, income } from "../engine/test-flows"
import { makeFixture } from "../engine/test-helpers"
import type { Fixture } from "../fixtures/fixture"

/** 2^52: half the safe range, rounded up, so two of them leave it; each one is safe. */
const HALF = 2 ** 52

/**
 * Two `pay` days of 2^52 each fall in Reporting year 2026 (M = 7) but in different Annual roll-ups:
 * 1 May 2027 closes the roll-up that began on 1 June 2026, and 1 June 2027 opens the next one. Each
 * day's `drain` leaves cash empty again, so no balance or roll-up leaves the safe integers. The
 * year's `income` line is 2^53, so the year alone overflows (ADR 0034).
 */
const overflowing: Fixture = makeFixture({
	accounts: [{ id: "cash", kind: "asset", rate: 0 }],
	balances: { cash: 0 },
	flows: [
		income("pay", HALF, { frequency: "monthly", start: "2027-05-01", end: "2027-06-15" }),
		expense("drain", HALF, { frequency: "monthly", start: "2027-05-01", end: "2027-06-15" }),
	],
	surplus: [{ account: "cash" }],
	withdraw: ["cash"],
	start: "2026-06-01",
	horizon: "2028-06-30",
})

describe("a Reporting year whose sum leaves the safe integers", () => {
	it("is a VALUE_OVERFLOW on the year's last day, though each Annual roll-up and month is safe", () => {
		const result = project(overflowing.baseline, overflowing.scenario, overflowing.timeline, {
			reporting: { yearStart: 7, years: true },
		})
		expect(result).toEqual({
			ok: false,
			problems: [{ code: "VALUE_OVERFLOW", date: "2027-06-30" }],
		})
	})
})
