/**
 * What `projection run` states for the plan over its whole horizon: the fees of every Account together
 * (`lifetimeFees`, cli ADR 0067). The engine sums it, so the page adds nothing (web ADR 0002).
 */
import type { ProjectionRun } from "../contract"
import { isZeroAmount } from "./compare/cell"

/** The plan's fees over the horizon, as the CLI states them. */
export interface FeesOverPlan {
	readonly amount: string
	readonly currency: string
}

/**
 * Whether a CLI money string is above zero. The contract states money as a decimal string, `-?\d+(\.\d+)?`, so
 * a figure is zero when its digits are all zeros (`isZeroAmount`) and below zero when it starts with a minus
 * sign; the page reads the text and never converts it to a number.
 */
export function isAboveZero(amount: string): boolean {
	return !isZeroAmount(amount) && !amount.startsWith("-")
}

/** The plan's fees over the plan when the run states them above zero; null when it states none, zero, or has no run. */
export function feesOverPlan(run: ProjectionRun | null | undefined): FeesOverPlan | null {
	const amount = run?.lifetimeFees
	if (run === null || run === undefined || amount === undefined || !isAboveZero(amount)) return null
	return { amount, currency: run.currency }
}
