import type {
	Baseline,
	HouseholdDocument,
	ProjectionRun,
	Read,
	ScenarioDocument,
} from "../../contract"
import { overlayDocument } from "../../what-if/overlay"
import type { SetChange } from "../../what-if/overrides"
import { type AccountCard, accountCards } from "../plan-items/accounts"
import { groupedIds } from "../plan-items/asset-document"
import { type FlowCard, type FlowKind, flowCards } from "../plan-items/flows"
import type { PlanKind } from "../plan-items/kinds"
import { plainAccounts } from "../plan-items/loan-card"
import { type ItemMarks, type MarkMap, marksOf, shownCards, type WasField } from "./items"

/** The session's changes to one plan, or null when no session is open on it. */
export type PlanChanges = {
	readonly sets: readonly SetChange[]
	readonly removals: readonly string[]
}

const FLOW_FIELDS = ["amount", "frequency", "start", "end", "growth", "earned", "employer"] as const
const ACCOUNT_FIELDS = [
	"rate",
	"compounding",
	"lockedUntil",
	"kind",
	"payout",
	"payoutHow",
	"fee",
	"lifetimeFees",
	"lifetimePayouts",
] as const

/** The cards of one planner page and what the session changes in each, by item id. */
export interface ItemsView<T> {
	readonly cards: readonly T[]
	readonly marks: MarkMap
}

function marksFor<T extends { id: string }>(
	baseline: readonly T[],
	whatIf: readonly T[],
	list: string,
	changes: PlanChanges,
	fields: readonly (keyof T & WasField)[],
): Record<string, ItemMarks> {
	return Object.fromEntries(
		baseline.map((card) => [
			card.id,
			marksOf(
				card,
				whatIf.find((entry) => entry.id === card.id),
				changes.removals.includes(`${list}.${card.id}`),
				fields,
			),
		]),
	)
}

/**
 * The Flow cards of a page as the what-if holds them, with the baseline's text of each changed field. The
 * Assets page lists no Flow, so its kind reads as income and its cards are not shown. A real asset's Flows are
 * on its card, so they are left out of the lists.
 */
export function flowItems(
	doc: ScenarioDocument,
	pageKind: PlanKind,
	household: HouseholdDocument | null,
	changes: PlanChanges | null,
): ItemsView<FlowCard> {
	const kind: FlowKind = pageKind === "expense" ? "expense" : "income"
	const grouped = groupedIds(doc)
	const listed = (flows: ScenarioDocument["flows"]) =>
		flowCards(
			flows.filter((flow) => !grouped.has(flow.id)),
			kind,
			household,
			flows,
		)
	const baseline = listed(doc.flows)
	if (changes === null) return { cards: baseline, marks: {} }
	const whatIf = listed(overlayDocument(doc, changes).flows)
	return {
		cards: shownCards(baseline, whatIf),
		marks: marksFor(baseline, whatIf, "flows", changes, FLOW_FIELDS),
	}
}

/**
 * The plain Account cards as the what-if holds them, with the baseline's text of each changed field. A loan's
 * Account is on its loan card, not here.
 */
export function accountItems(
	doc: ScenarioDocument,
	baselineRead: Read<Baseline> | undefined,
	changes: PlanChanges | null,
	runs: { run?: ProjectionRun | undefined; tried?: ProjectionRun | undefined } = {},
): ItemsView<AccountCard> {
	const { run, tried = run } = runs
	const baseline = accountCards(plainAccounts(doc), baselineRead, run)
	if (changes === null) return { cards: baseline, marks: {} }
	const whatIf = accountCards(overlayDocument(doc, changes).accounts, baselineRead, tried)
	return {
		cards: shownCards(baseline, whatIf),
		marks: marksFor(baseline, whatIf, "accounts", changes, ACCOUNT_FIELDS),
	}
}
