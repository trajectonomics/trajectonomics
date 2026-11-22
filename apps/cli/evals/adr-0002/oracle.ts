import { financialIndependence, type Scenario } from "@trajectonomics/core/sim"
import { calculateThTax } from "@trajectonomics/core/tax/th"
import type { Persona } from "./persona"
import { baselineOf, scenarioOf, timelineOf } from "./scenario"
import { taxInputOf } from "./tax-input"

/** The figures an answer may differ by and still count as correct (see README). */
export const TOLERANCE = {
	/** FI month, in calendar months, either side of the oracle's month. */
	fiMonths: 1,
	/** Tax for the 2026 tax year, in baht. */
	taxBaht: 1,
} as const

/** The answers the oracle expects for one persona. `null` means FI is not reached by the horizon. */
export interface Expected {
	readonly fiMonth: string | null
	readonly tax2026Baht: number
	readonly whatIfFiMonth: string | null
}

/** The FI month (`YYYY-MM`) under the survival definition, or `null` when the horizon ends first. */
export function fiMonthOf(persona: Persona, scenario: Scenario): string | null {
	const result = financialIndependence(baselineOf(persona), scenario, timelineOf(persona), {
		method: "survival",
	})
	if (!result.ok) {
		throw new Error(
			`the oracle refused ${persona.id}: ${result.problems.map((p) => p.code).join(", ")}`,
		)
	}
	const answer = result.financialIndependence
	return answer.reachable ? answer.month.slice(0, 7) : null
}

/** The 2026 Thai income tax the person owes, from the tax core's annual computation. */
export function taxBahtOf(persona: Persona): number {
	return Number(calculateThTax(taxInputOf(persona)).netTaxPayable)
}

/** Everything the oracle expects for a persona: the base FI, the 2026 tax and the stated what-if. */
export function expectedAnswers(persona: Persona): Expected {
	const whatIf = { id: persona.whatIf.flowId, monthlyBaht: persona.whatIf.monthlyBaht }
	return {
		fiMonth: fiMonthOf(persona, scenarioOf(persona)),
		tax2026Baht: taxBahtOf(persona),
		whatIfFiMonth: fiMonthOf(persona, scenarioOf(persona, whatIf)),
	}
}
