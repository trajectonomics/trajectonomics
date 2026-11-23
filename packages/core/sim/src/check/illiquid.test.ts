import { describe, expect, it } from "bun:test"
import { check } from "../check"
import { expected } from "../testing"

const baseline = {
	schemaVersion: 1,
	balances: [
		{ account: "cash", amount: 100 },
		{ account: "home", amount: 500 },
	],
}

const cash = { id: "cash", kind: "asset", rate: 0 }
const home = { id: "home", kind: "asset", rate: 0, liquid: false }
const loan = { id: "loan", kind: "liability", rate: 0 }

const timeline = { start: "2026-01-01", horizon: "2026-12-31", resolution: "day" }

/** A Scenario whose only Flows are none: the routing lists are what each test varies. */
function scenario(accounts: readonly unknown[], cashflow: Record<string, unknown>) {
	return {
		schemaVersion: 4,
		currency: "THB",
		economy: { inflation: 0 },
		accounts,
		flows: [],
		cashflow: { surplus: [{ account: "cash" }], contribute: [], withdraw: ["cash"], ...cashflow },
	}
}

const plain = scenario([cash, home, loan], {})

describe("check() marks an asset illiquid with liquid: false", () => {
	it("accepts liquid: false on an asset, and liquid: true as liquid", () => {
		expect(check(baseline, plain, timeline)).toEqual([])
		const liquid = scenario([cash, { ...home, liquid: true }, loan], {})
		expect(check(baseline, liquid, timeline)).toEqual([])
	})

	it("rejects liquid on a liability Account", () => {
		const onLoan = scenario([cash, home, { ...loan, liquid: false }], {})
		expect(check(baseline, onLoan, timeline)).toEqual(
			expected("LIABILITY_MISUSE", ["scenario", "accounts", 2, "liquid"]),
		)
	})

	it("rejects a liquid value that is not a boolean", () => {
		const stringy = scenario([cash, { ...home, liquid: "no" }, loan], {})
		expect(check(baseline, stringy, timeline)).toEqual(
			expected("WRONG_TYPE", ["scenario", "accounts", 1, "liquid"]),
		)
	})

	it("refuses a withdrawal from an illiquid Account", () => {
		const drawn = scenario([cash, home, loan], { withdraw: ["cash", "home"] })
		expect(check(baseline, drawn, timeline)).toEqual(
			expected("ILLIQUID_ROUTED", ["scenario", "cashflow", "withdraw", 1]),
		)
	})

	it("refuses a surplus step that names an illiquid Account", () => {
		const filled = scenario([cash, home, loan], {
			surplus: [{ account: "cash", upTo: 100 }, { account: "home" }],
		})
		expect(check(baseline, filled, timeline)).toEqual(
			expected("ILLIQUID_ROUTED", ["scenario", "cashflow", "surplus", 1, "account"]),
		)
	})

	it("lets a contribution route to an illiquid Account, and a liquid one to a withdrawal", () => {
		const contributed = scenario([cash, home, loan], { contribute: ["home"] })
		expect(check(baseline, contributed, timeline)).toEqual([])
		const drawnLiquid = scenario([cash, { ...home, liquid: true }, loan], {
			withdraw: ["cash", "home"],
		})
		expect(check(baseline, drawnLiquid, timeline)).toEqual([])
	})
})
