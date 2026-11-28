import { withSearch } from "../lib/view/links"
import type { TaxLabelOffer } from "../lib/view/plan-items/tax-label"
import { withParam } from "./query-string"

/**
 * The plan and Flow of a just-saved new income in a taxed plan that needs its tax label, offered where the drawer
 * closes to. The notice builds the Tax labels link from the current address when it shows.
 * It holds one offer at a time, so a later save replaces an earlier notice.
 */
class TaxLabelNotice {
	held = $state<TaxLabelOffer | null>(null)

	offer(next: TaxLabelOffer): void {
		this.held = next
	}

	clear(): void {
		this.held = null
	}
}

/** The Tax profile page for a plan, keeping the rest of the query of the page the notice shows on. */
export function taxLabelsHref(search: string, plan: string): string {
	return withSearch("/settings/tax/", withParam(search, "scenario", plan))
}

/** The notice one page holds: the plan and Flow of the last saved income, or null. */
export const taxLabelNotice = new TaxLabelNotice()
