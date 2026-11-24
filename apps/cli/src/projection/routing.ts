import type {
	ProjectionOptions,
	ProjectionRouting,
	RoutedAmount,
	RoutedResolved,
	Scenario,
} from "@trajectonomics/core/sim"
import { formatPercent } from "../scenario/percent"
import { moneyOf } from "./money"
import type {
	RoutedResolvedView,
	RoutedTargetView,
	RoutingView,
	SurplusEntryView,
	WithdrawEntryView,
} from "./routing-view"

/*
 * `projection run`'s `routing` echo (cli ADR-0070): the Scenario's `cashflow.surplus` and `cashflow.withdraw`
 * as the engine reads them, each entry by its position with its Account, its share and its target. It states the
 * document's own figures in the CLI's money and computes nothing: what a grown target is worth at the start and
 * at the horizon is the Projection's `routing` statement, formatted, never worked out here (cli ADR-0058, sim
 * ADR-0030). An entry whose target is nominal states no `resolved`: the target is its own value on every date.
 */

/** The engine option that makes the Projection state each grown target's value, asked for only by a run that prints it. */
export function routingOption(document: Scenario): Pick<ProjectionOptions, "routing"> {
	return usesGrownTarget(document.cashflow) ? { routing: true } : {}
}

function resolvedOf(
	value: RoutedAmount | undefined,
	stated: RoutedResolved | null | undefined,
	money: (minor: number) => string,
): { resolved?: RoutedResolvedView } {
	if (typeof value !== "object" || stated === null || stated === undefined) return {}
	return { resolved: { first: money(stated.first), horizon: money(stated.horizon) } }
}

function targetOf(value: RoutedAmount, money: (minor: number) => string): RoutedTargetView {
	return typeof value === "number"
		? { amount: money(value), growth: null }
		: { amount: money(value.amount), growth: value.growth }
}

/** Whether any `upTo` or `downTo` keeps its value in today's money: the one case the engine states a resolved figure. */
function usesGrownTarget(cashflow: Scenario["cashflow"]): boolean {
	return (
		cashflow.surplus.some((step) => typeof step.upTo === "object") ||
		cashflow.withdraw.some((entry) => typeof entry !== "string" && typeof entry.downTo === "object")
	)
}

/** Whether the document uses a form that ships with routing: a share, a floor, or a target that keeps its value. */
function usesRoutingForms(cashflow: Scenario["cashflow"]): boolean {
	return (
		cashflow.surplus.some((step) => step.share !== undefined || typeof step.upTo === "object") ||
		cashflow.withdraw.some((entry) => typeof entry !== "string")
	)
}

/** The routing echo, or `undefined` for a plain routing, so a run without the new forms keeps its bytes. */
export function routingOf(
	document: Scenario,
	currency: string,
	stated: ProjectionRouting | undefined,
): RoutingView | undefined {
	const { cashflow } = document
	if (!usesRoutingForms(cashflow)) return undefined
	const money = moneyOf(currency)
	const surplus: SurplusEntryView[] = cashflow.surplus.map((step, entry) => ({
		entry,
		account: step.account,
		upTo: step.upTo === undefined ? null : targetOf(step.upTo, money),
		share: step.share === undefined ? null : formatPercent(step.share),
		...resolvedOf(step.upTo, stated?.surplus[entry]?.upTo, money),
	}))
	const withdraw: WithdrawEntryView[] = cashflow.withdraw.map((item, entry) =>
		typeof item === "string"
			? { entry, account: item, downTo: null }
			: {
					entry,
					account: item.account,
					downTo: targetOf(item.downTo, money),
					...resolvedOf(item.downTo, stated?.withdraw[entry]?.downTo, money),
				},
	)
	return { surplus, withdraw }
}
