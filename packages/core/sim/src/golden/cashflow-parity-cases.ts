import { handCase } from "./cashflow-cases"
import { categorisedFreelancer } from "./expense-category-cases"
import { levyRefundDay, levyShortfallDay } from "./levy-cases"
import { borrowDay } from "./loan-cases"
import type { ParityCase } from "./parity-cases"

const withBreakdown = { cashflowBreakdown: true } as const

function breakdownCase(name: string, fixture: ParityCase["fixture"]): ParityCase {
	return { name, fixture, projectOptions: withBreakdown }
}

/** Projections with `cashflowBreakdown`; the cases without it stay in `PARITY_CASES`. */
export const CASHFLOW_PARITY_CASES: readonly ParityCase[] = [
	breakdownCase("cashflow-hand-year", handCase),
	breakdownCase("cashflow-categorised-freelancer", categorisedFreelancer),
	breakdownCase("cashflow-levy-refund-day", levyRefundDay),
	breakdownCase("cashflow-levy-shortfall-day", levyShortfallDay),
	breakdownCase("cashflow-loan-borrow-day", borrowDay),
]
