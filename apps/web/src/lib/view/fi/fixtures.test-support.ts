import type { Fi, FiResult } from "../../contract"
import type { UnreachableBinding } from "./binding"

/** The reference of a reachable answer, hand-made: a multiple of 25 that is not met. */
export const REFERENCE: Extract<FiResult, { reachable: true }>["reference"] = {
	label: "ruleOfThumb",
	date: "2041-03-01",
	multiplier: 25,
	basis: "unlockedAssets",
	window: "next12Months",
	terms: "nominal",
	unlockedAssets: "1000000.00",
	numerator: "1000000.00",
	annualExpenses: "50000.00",
	threshold: "1250000.00",
	multipleBps: 200000,
	partial: false,
	met: false,
}

export const REACHABLE: FiResult = {
	reachable: true,
	fiDate: "2041-03-01",
	reference: REFERENCE,
}

/** A hand-made FI answer for every unreachable binding, with a best case where the CLI gives one. */
export const UNREACHABLE: Record<UnreachableBinding, FiResult> = {
	noCandidateMonth: { reachable: false, binding: "noCandidateMonth" },
	shortfallBeforeStop: {
		reachable: false,
		binding: "shortfallBeforeStop",
		bestCase: { month: "2030-01-01", runsOut: { date: "2029-06-01", unmet: "500.00" } },
	},
	undrawableMoney: {
		reachable: false,
		binding: "undrawableMoney",
		bestCase: { month: "2030-02-01", runsOut: { date: "2031-05-01", unmet: "700.00" } },
	},
	insufficientMoney: {
		reachable: false,
		binding: "insufficientMoney",
		bestCase: { month: "2030-03-01", runsOut: { date: "2031-08-01", unmet: "900.00" } },
	},
	minimumBuffer: {
		reachable: false,
		binding: "minimumBuffer",
		bestCase: {
			month: "2030-04-01",
			bufferBreach: { date: "2030-09-01", required: "300000.00", accessible: "250000.00" },
		},
	},
}

/** A complete FI answer: the projection's echo around the given survival answer. */
export function fiFixture(answer: FiResult, patch: Partial<Fi> = {}): Fi {
	return {
		asOf: "2026-10-31",
		horizon: "2060-12-31",
		engine: { package: "@fixture/engine", version: "9.8.7" },
		scenario: {
			id: "scenario-fixture-1",
			name: "base",
			contentHash: "jcs1:sha256:0123456789abcdef0123456789abcdef",
			effectiveContentHash: "jcs1:sha256:0123456789abcdef0123456789abcdef",
		},
		overrides: [],
		tax: "not_applied",
		notes: ["Tax is not applied: no Levy."],
		currency: "THB",
		method: "survival",
		definition: { method: "survival", definitionVersion: 1, explanation: "" },
		fi: answer.reachable ? { ...answer, ages: [] } : answer,
		taxYears: [],
		...patch,
	}
}
