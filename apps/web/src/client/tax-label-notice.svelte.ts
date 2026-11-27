import type { TaxLabelOffer } from "../lib/view/plan-items/tax-label"
import { withParam } from "./query-string"

/**
 * The Tax labels page a just-saved new income in a taxed plan needs its label on, offered where the drawer closes to.
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

/** The Tax labels page for a plan, keeping the rest of the query of the page the notice shows on. */
export function taxLabelsHref(search: string, plan: string): string {
	return `/settings/tax/${withParam(search, "scenario", plan)}`
}

/** The notice one page holds: the last saved income's Tax labels page, or null. */
export const taxLabelNotice = new TaxLabelNotice()
