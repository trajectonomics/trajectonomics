import type { Account, Flow, Scenario } from "../types"
import { isLevel } from "../types"
import { levelPayment, PERIODS_PER_YEAR } from "./level"

/** Whether the Scenario declares a withdrawal Flow, so its Projection reports withdrawals. */
export function declaresWithdrawals(scenario: Scenario): boolean {
	return scenario.flows.some((flow) => flow.kind === "withdrawal")
}

/** Whether the Scenario declares a transfer Flow, so its Projection reports transfers (ADR 0031). */
export function declaresTransfers(scenario: Scenario): boolean {
	return scenario.flows.some((flow) => flow.kind === "transfer")
}

/** Whether a transfer Flow pays `account` down, so its liability statement lists what was transferred. */
export function isTransferTarget(scenario: Scenario, account: string): boolean {
	return scenario.flows.some((flow) => flow.kind === "transfer" && flow.target === account)
}

/**
 * The Flow the engine runs: a `level` contribution becomes a fixed amount of its one exact payment,
 * which does not grow. Any other Flow is returned as it is.
 */
export function resolveLoan(flow: Flow, accounts: readonly Account[]): Flow {
	if (!isLevel(flow) || flow.kind !== "contribution") return flow
	const rule = accounts.find((account) => account.id === flow.target)
	const period = rule?.compounding
	// Unreachable for a Scenario that passed `check()`, which refuses every loan this cannot price.
	const amount =
		rule === undefined || period === undefined
			? 0
			: (levelPayment({
					principal: flow.level.principal,
					rate: rule.rate,
					periodsPerYear: PERIODS_PER_YEAR[period],
					payments: flow.level.payments,
					rounding: flow.level.rounding,
				}) ?? 0)
	const { level: _level, ...rest } = flow
	return { ...rest, amount, growth: { bps: 0 } }
}
