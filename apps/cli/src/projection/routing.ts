import type { RoutedAmount, Scenario } from "@trajectonomics/core/sim"
import { moneyOf } from "./money"
import type {
	RoutedTargetView,
	RoutingView,
	SurplusEntryView,
	WithdrawEntryView,
} from "./routing-view"

/*
 * `projection run`'s `routing` echo (cli ADR-0070): the Scenario's `cashflow.surplus` and `cashflow.withdraw`
 * as the engine reads them, each entry by its position with its Account, its share and its target. It states the
 * document's own figures in the CLI's money and computes nothing: the amount a grown target is worth on a date
 * is the engine's, and the engine does not state it (cli ADR-0058).
 */

function targetOf(value: RoutedAmount, money: (minor: number) => string): RoutedTargetView {
	return typeof value === "number"
		? { amount: money(value), growth: null }
		: { amount: money(value.amount), growth: value.growth }
}

/** Whether the document uses a form that ships with routing: a share, a floor, or a target that keeps its value. */
function usesRoutingForms(cashflow: Scenario["cashflow"]): boolean {
	return (
		cashflow.surplus.some((step) => step.share !== undefined || typeof step.upTo === "object") ||
		cashflow.withdraw.some((entry) => typeof entry !== "string")
	)
}

/** The routing echo, or `undefined` for a plain routing, so a run without the new forms keeps its bytes. */
export function routingOf(document: Scenario, currency: string): RoutingView | undefined {
	const { cashflow } = document
	if (!usesRoutingForms(cashflow)) return undefined
	const money = moneyOf(currency)
	const surplus: SurplusEntryView[] = cashflow.surplus.map((step, entry) => ({
		entry,
		account: step.account,
		upTo: step.upTo === undefined ? null : targetOf(step.upTo, money),
		share: step.share ?? null,
	}))
	const withdraw: WithdrawEntryView[] = cashflow.withdraw.map((item, entry) =>
		typeof item === "string"
			? { entry, account: item, downTo: null }
			: { entry, account: item.account, downTo: targetOf(item.downTo, money) },
	)
	return { surplus, withdraw }
}
