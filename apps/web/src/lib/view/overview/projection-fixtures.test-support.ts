import type { Fi, FiResult, ProjectionRun } from "../../contract"

const SHAPE = {
	asOf: "2026-10-31",
	engine: { package: "@trajectonomics/cli", version: "0.0.0" },
	scenario: { id: "s-base", name: "base", contentHash: "h1", effectiveContentHash: "h1" },
	overrides: [],
	removals: [],
	tax: "applied" as const,
	notes: [],
	currency: "THB",
}

/** The fields every projection-shaped result carries, with the given horizon. */
export function shape(horizon = "2060-12-31") {
	return { ...SHAPE, horizon }
}

/** A `fi` result for the base Scenario, with the given FI answer and no tax rows. */
export function fi(result: FiResult): Fi {
	return {
		...shape(),
		method: "survival",
		definition: { method: "survival", definitionVersion: 1, explanation: "" },
		fi: result.reachable ? { ...result, ages: [] } : result,
		taxYears: [],
	}
}

/** A tax period for the Levy "th-2026-pit". */
export function taxYear(
	from: string,
	to: string,
	owed: string,
	settled = true,
	partial = false,
): ProjectionRun["taxYears"][number] {
	return {
		levy: "th-2026-pit",
		from,
		to,
		settlementDate: "2027-03-31",
		due: owed,
		prepaid: "0.00",
		owed,
		settled,
		partial,
		assumptions: [],
	}
}

/** An annual row closing at the given date, nominal and real. */
export function annualRow(to: string, closing: string, real: string) {
	return {
		index: 0,
		from: "2026-10-31",
		to,
		ages: [],
		openingNetWorth: "0.00",
		closingNetWorth: closing,
		income: "0.00",
		expense: "0.00",
		contributions: "0.00",
		unfundedContributions: "0.00",
		interest: "0.00",
		unmet: "0.00",
		partial: false,
		realNetWorth: { date: to, amount: real },
	}
}

/** A projection run with the given tax status, tax rows, runs-out and annual rows. */
export function projectionRun(options: {
	tax?: ProjectionRun["tax"]
	taxYears?: ProjectionRun["taxYears"]
	runsOut?: ProjectionRun["runsOut"]
	annual?: ReturnType<typeof annualRow>[]
	horizon?: string
}): ProjectionRun {
	return {
		...shape(options.horizon),
		tax: options.tax ?? "applied",
		runsOut: options.runsOut ?? null,
		taxYears: options.taxYears ?? [],
		tables: [{ name: "annual", count: options.annual?.length ?? 0, rows: options.annual ?? [] }],
	}
}

/** A reachable FI answer, reached in October 2042. */
export function reachableFi(): Fi {
	return fi({
		reachable: true,
		fiDate: "2042-10-01",
		reference: {
			label: "ruleOfThumb",
			date: "2042-10-01",
			multiplier: 25,
			basis: "unlockedAssets",
			window: "next12Months",
			terms: "nominal",
			unlockedAssets: "1.00",
			numerator: "1.00",
			annualExpenses: "1.00",
			threshold: "1.00",
			multipleBps: null,
			partial: false,
			met: false,
		},
	})
}
