import type { CompareSide, FiResult, ScenarioRef } from "../../contract"

type AtAge = CompareSide["netWorth"]["atAges"][number]
type Final = CompareSide["netWorth"]["final"]

/** Hand-made figures: no test here pins the Demo snapshot. */
export const BASE: ScenarioRef = {
	id: "base-id",
	name: "base",
	contentHash: "jcs1:sha256:eba036341234ffff0000",
	effectiveContentHash: "jcs1:sha256:eba036341234ffff0000",
}

export const EARLY: ScenarioRef = {
	id: "early-id",
	name: "retire-early",
	contentHash: "jcs1:sha256:96b45010aaaabbbbcccc",
	effectiveContentHash: "jcs1:sha256:96b45010aaaabbbbcccc",
}

/** A reachable FI date, with the reference it was read against. */
export function reachable(fiDate: string): FiResult {
	return {
		reachable: true,
		fiDate,
		reference: {
			label: "ruleOfThumb",
			date: fiDate,
			multiplier: 25,
			basis: "unlockedAssets",
			window: "next12Months",
			terms: "nominal",
			unlockedAssets: "100.00",
			numerator: "100.00",
			annualExpenses: "4.00",
			threshold: "100.00",
			multipleBps: 250000,
			partial: false,
			met: true,
		},
	}
}

/** An FI date that is not reachable, with the constraint that binds it. */
export const UNREACHABLE: FiResult = {
	reachable: false,
	binding: "insufficientMoney",
	bestCase: { month: "2040-06-01", runsOut: { date: "2056-05-01", unmet: "70359.24" } },
}

/** One side of a compare: its Scenario, FI result, run-out, end and ages. */
export function side(options: {
	scenario: ScenarioRef
	fi: FiResult
	runOut: { date: string; unmet: string } | null
	final: Final
	atAges: AtAge[]
}): CompareSide {
	return {
		scenario: options.scenario,
		overrides: [],
		fi: options.fi,
		taxYears: [],
		runOut: options.runOut,
		netWorth: { final: options.final, atAges: options.atAges },
	}
}

/** The base Scenario: FI reachable, never runs out, ends at the horizon. */
export const SIDE_A = side({
	scenario: BASE,
	fi: reachable("2042-10-01"),
	runOut: null,
	final: { date: "2060-12-31", nominal: "19756836.98", real: "7196252.23" },
	atAges: [
		{ age: 45, nominal: "6520465.53", real: "5072417.00" },
		{ age: 55, nominal: "16119241.91", real: "9330581.52" },
		{ age: 60, nominal: "22869824.55", real: "11419334.85" },
	],
})

/** The early Scenario: FI unreachable, runs out in 2056, and does not reach age 60. */
export const SIDE_B = side({
	scenario: EARLY,
	fi: UNREACHABLE,
	runOut: { date: "2056-05-01", unmet: "70359.24" },
	final: { date: "2056-05-01", nominal: "0.00", real: "0.00" },
	atAges: [
		{ age: 45, nominal: "6520465.53", real: "5072417.00" },
		{ age: 55, nominal: "8588148.13", real: "4971227.35" },
		{ age: 60, nominal: null, real: null },
	],
})
