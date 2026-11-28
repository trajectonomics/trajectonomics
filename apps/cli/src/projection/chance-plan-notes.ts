import type { PlanModel } from "./chance-plan"

/** What a plan-built model says beside the chance: where it came from, and what the engine clamped. */
export function planNotes(plan: PlanModel): string[] {
	const accounts = plan.view.accounts
		.map((a) => `${a.id} (rate ${a.rate} bps, volatility ${a.volatility} bps)`)
		.join(", ")
	const built =
		plan.view.accounts.length === 0
			? `The Return model is the plan's own, built in ${plan.view.buckets} buckets from the Scenario's inflation spread; every Account keeps its rate.`
			: `The Return model is the plan's own, built in ${plan.view.buckets} buckets from the Accounts that swing: ${accounts}${inflationSpread(plan)}. Every Account without a volatility keeps its rate.`
	return [built, ...plan.notes]
}

/** The Scenario's inflation spread beside the Accounts that swing, or nothing without one. */
function inflationSpread(plan: PlanModel): string {
	const inflation = plan.view.inflation
	return inflation === undefined
		? ""
		: `, and the Scenario's inflation spread (rate ${inflation.rate} bps, volatility ${inflation.volatility} bps)`
}
