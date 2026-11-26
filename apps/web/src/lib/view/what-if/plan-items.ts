import type { Baseline, ProjectionRun, Read, ScenarioDocument } from "../../contract"
import { lensDocument } from "../../what-if/lens-document"
import { type ItemNames, NO_ITEM_NAMES } from "../item-names"
import { type AccountCard, accountCards } from "../plan-items/accounts"
import { plainAccounts } from "../plan-items/unplaced"
import { shownCards } from "./items"
import { marksFor } from "./marks"
import type { ItemsView, PlanChanges } from "./plan-changes"

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

/**
 * The plain Account cards as the what-if holds them, with the baseline's text of each changed field. A loan's
 * Account is on its loan card, not here.
 */
export function accountItems(
	doc: ScenarioDocument,
	baselineRead: Read<Baseline> | undefined,
	changes: PlanChanges | null,
	runs: { run?: ProjectionRun | undefined; tried?: ProjectionRun | undefined } = {},
	names: ItemNames = NO_ITEM_NAMES,
): ItemsView<AccountCard> {
	const { run, tried = run } = runs
	const baseline = accountCards(plainAccounts(doc), baselineRead, run, names)
	if (changes === null) return { cards: baseline, marks: {} }
	const whatIf = accountCards(lensDocument(doc, changes).accounts, baselineRead, tried, names)
	return {
		cards: shownCards(baseline, whatIf),
		marks: marksFor(baseline, whatIf, "accounts", changes, ACCOUNT_FIELDS),
	}
}

export { flowItems } from "./flow-items"
export type { ItemsView, PlanChanges } from "./plan-changes"
