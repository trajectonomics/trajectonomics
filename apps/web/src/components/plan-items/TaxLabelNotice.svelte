<script lang="ts">
import { currentSearch } from "../../client/location.svelte.js"
import { taxLabelNotice, taxLabelsHref } from "../../client/tax-label-notice.svelte.js"
import type { ScenarioDocument } from "../../lib/contract"
import {
	heldTaxLabel,
	heldTaxLabelOffer,
	heldTaxStep,
	type TaxLabelOrigin,
} from "../../lib/view/plan-items/tax-label"

interface Props {
	/** The plan the notice must name. */
	plan: string
	/** The plan's document, which says whether an income still needs its label; null while the saved plan is not opened. */
	doc: ScenarioDocument | null
	/** The page that made the offer: Home shows a guided save's step, the items pages a drawer save's note. */
	source: TaxLabelOrigin
	/** Says the sentence is the page's next step after a save, rather than the income page's note. */
	next?: boolean
}

let { plan, doc, source, next = false }: Props = $props()
const offer = $derived(taxLabelNotice.held)
const held = $derived(
	doc === null
		? heldTaxLabelOffer(offer, plan, source)
		: next
			? heldTaxStep(offer, plan, source, doc)
			: heldTaxLabel(offer, plan, source, doc),
)
const href = $derived(held ? taxLabelsHref(currentSearch(), plan) : null)
/** A guided plan has no tax profile, so its page offers the profile instead of a labels section. */
const untaxed = $derived(next && offer?.taxed === false)
const LINK =
	"underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
</script>

<!-- A saved income in a taxed plan has no label yet, and the tax rules read only labelled income. The status stays
     mounted, so a screen reader hears the sentence when a save offers it. -->
<div role="status">
	{#if href !== null && untaxed}
		<p class="text-sm text-muted-foreground">
			Next: set up tax in <a {href} onclick={() => taxLabelNotice.clear()} class={LINK}>Tax profile</a>.
		</p>
	{:else if href !== null}
		<p class="text-sm text-muted-foreground">
			{next ? "Next: give your income its tax labels in" : "Give this income a label in"}
			<a {href} onclick={() => taxLabelNotice.clear()} class={LINK}>Tax labels</a>.
		</p>
	{/if}
</div>
