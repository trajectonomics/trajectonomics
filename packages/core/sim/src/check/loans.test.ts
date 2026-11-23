import { describe, expect, it } from "bun:test"
import type { ErrorCode, Path } from "./codes"
import { check } from "./index"

const baseline = { schemaVersion: 1, balances: [{ account: "cash", amount: 0 }] }
const timeline = { start: "2026-01-01", horizon: "2027-01-01", resolution: "month" }

const accounts = [
	{ id: "cash", kind: "asset", rate: 0 },
	{ id: "car", kind: "asset", rate: 0 },
	{ id: "loan", kind: "liability", rate: 600, compounding: "monthly" },
	{ id: "card", kind: "liability", rate: 1800 },
	{ id: "quarterly", kind: "liability", rate: 800, compounding: "quarterly" },
	{ id: "half", kind: "liability", rate: 600, compounding: "semiannual" },
]

const level = { principal: 10_000_000, payments: 12, rounding: "halfUp" }

function flow(overrides: Record<string, unknown>): Record<string, unknown> {
	return {
		id: "f",
		kind: "contribution",
		target: "loan",
		frequency: "monthly",
		start: "2026-01-31",
		level,
		...overrides,
	}
}

function problemsOf(flows: readonly Record<string, unknown>[], accountList = accounts) {
	const scenario = {
		schemaVersion: 4,
		currency: "THB",
		economy: { inflation: 0 },
		accounts: accountList,
		flows,
		cashflow: { surplus: [{ account: "cash" }], contribute: ["car"], withdraw: ["cash"] },
	}
	return check(baseline, scenario, timeline)
}

function codeAt(flows: readonly Record<string, unknown>[], path: Path): ErrorCode | undefined {
	return problemsOf(flows).find((problem) => problem.path.join("/") === path.join("/"))?.code
}

const at = (index: number, ...rest: (string | number)[]): Path => [
	"scenario",
	"flows",
	index,
	...rest,
]

describe("a valid loan passes check", () => {
	it("accepts a withdrawal from a liability and a level payment into one", () => {
		const flows = [
			{
				id: "draw",
				kind: "withdrawal",
				source: "loan",
				frequency: "once",
				start: "2026-02-01",
				amount: 500,
				growth: { bps: 0 },
			},
			flow({ id: "pay" }),
		]
		expect(problemsOf(flows)).toEqual([])
	})
})

describe("withdrawal refusals", () => {
	it("refuses an asset as the source, at source", () => {
		const flows = [
			{
				id: "draw",
				kind: "withdrawal",
				source: "cash",
				frequency: "once",
				start: "2026-02-01",
				amount: 500,
				growth: { bps: 0 },
			},
		]
		expect(codeAt(flows, at(0, "source"))).toBe("WITHDRAWAL_SOURCE_KIND")
	})

	it("refuses an undeclared source as an unknown account", () => {
		const flows = [
			{
				id: "draw",
				kind: "withdrawal",
				source: "nope",
				frequency: "once",
				start: "2026-02-01",
				amount: 500,
				growth: { bps: 0 },
			},
		]
		expect(codeAt(flows, at(0, "source"))).toBe("UNKNOWN_ACCOUNT")
	})
})

describe("level payment refusals", () => {
	it("refuses a target that is an asset, at target", () => {
		expect(codeAt([flow({ target: "cash" })], at(0, "target"))).toBe("LEVEL_TARGET_NOT_LIABILITY")
	})

	it("refuses a liability with no compounding period, at target", () => {
		expect(codeAt([flow({ target: "card" })], at(0, "target"))).toBe("LEVEL_TARGET_NOT_NOMINAL")
	})

	it("refuses a frequency other than the target's compounding period, at frequency", () => {
		expect(codeAt([flow({ frequency: "quarterly" })], at(0, "frequency"))).toBe(
			"LEVEL_FREQUENCY_MISMATCH",
		)
	})

	it("refuses every frequency for a semiannual target, because no Flow frequency pays it", () => {
		expect(codeAt([flow({ target: "half", frequency: "annual" })], at(0, "frequency"))).toBe(
			"LEVEL_FREQUENCY_MISMATCH",
		)
	})

	it("refuses zero payments, at level.payments", () => {
		expect(codeAt([flow({ level: { ...level, payments: 0 } })], at(0, "level", "payments"))).toBe(
			"LEVEL_PAYMENTS_OUT_OF_RANGE",
		)
	})

	it("refuses a negative principal, at level.principal", () => {
		expect(
			codeAt([flow({ level: { ...level, principal: -1 } })], at(0, "level", "principal")),
		).toBe("NEGATIVE_AMOUNT")
	})

	it("refuses a missing rounding, at level.rounding", () => {
		const { rounding: _rounding, ...withoutRounding } = level
		expect(codeAt([flow({ level: withoutRounding })], at(0, "level", "rounding"))).toBe(
			"MISSING_KEY",
		)
	})

	it("refuses an unknown rounding, at level.rounding", () => {
		expect(
			codeAt([flow({ level: { ...level, rounding: "down" } })], at(0, "level", "rounding")),
		).toBe("INVALID_ROUNDING")
	})

	it("refuses a payment that overflows, at level", () => {
		const huge = { ...level, principal: Number.MAX_SAFE_INTEGER, payments: 1 }
		expect(codeAt([flow({ level: huge })], at(0, "level"))).toBe("LEVEL_PAYMENT_OVERFLOW")
	})

	it("refuses a level beside an amount, at level", () => {
		expect(codeAt([flow({ amount: 100, growth: { bps: 0 } })], at(0, "level"))).toBe(
			"FIELD_NOT_ALLOWED",
		)
	})

	it("refuses a level on an expense, at level", () => {
		expect(
			codeAt(
				[
					{
						id: "rent",
						kind: "expense",
						frequency: "monthly",
						start: "2026-01-31",
						level,
						amount: 1,
					},
				],
				at(0, "level"),
			),
		).toBe("FIELD_NOT_ALLOWED")
	})
})

describe("loan refusal paths are plain data", () => {
	it("reports a withdrawal source problem without a Projection", () => {
		const flows = [
			{
				id: "draw",
				kind: "withdrawal",
				source: "cash",
				frequency: "once",
				start: "2026-02-01",
				amount: 500,
				growth: { bps: 0 },
			},
		]
		expect(problemsOf(flows).map((problem) => problem.code)).toEqual(["WITHDRAWAL_SOURCE_KIND"])
	})
})
