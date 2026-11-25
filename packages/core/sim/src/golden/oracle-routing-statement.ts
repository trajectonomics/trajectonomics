import type { DateString, RoutedAmount, Scenario } from "../types"
import { oracleTarget } from "./oracle-routing"

/** One step's or entry's target in force on the Timeline start and on the horizon; null when it has none. */
export type OracleResolved = { readonly first: bigint; readonly horizon: bigint } | null

export interface OracleStatement {
	readonly surplus: readonly OracleResolved[]
	readonly withdraw: readonly OracleResolved[]
}

/** What the routing statement should say, from the Scenario alone, with the oracle's own growth. */
export function oracleStatement(
	scenario: Scenario,
	start: DateString,
	horizon: DateString,
): OracleStatement {
	const { inflation } = scenario.economy
	const resolve = (target: RoutedAmount | undefined): OracleResolved =>
		target === undefined
			? null
			: {
					first: oracleTarget(target, start, start, inflation),
					horizon: oracleTarget(target, start, horizon, inflation),
				}
	return {
		surplus: scenario.cashflow.surplus.map((step) => resolve(step.upTo)),
		withdraw: scenario.cashflow.withdraw.map((entry) =>
			resolve(typeof entry === "string" ? undefined : entry.downTo),
		),
	}
}
