<script lang="ts">
import { currentSearch } from "../../client/location.svelte.js"
import { taxLabelNotice, taxLabelsHref } from "../../client/tax-label-notice.svelte.js"
import type { ScenarioDocument } from "../../lib/contract"
import { heldTaxLabel } from "../../lib/view/plan-items/tax-label"

interface Props {
	/** The plan the notice must name. */
	plan: string
	/** The plan's document, which says whether the Flow still needs its label; null while the saved plan is not opened. */
	doc: ScenarioDocument | null
	/** Says the sentence is the page's next step after a save, rather than the income page's note. */
	next?: boolean
}

let { plan, doc, next = false }: Props = $props()
const offer = $derived(taxLabelNotice.held)
const held = $derived(
	doc === null ? offer !== null && offer.plan === plan : heldTaxLabel(offer, plan, doc),
)
const href = $derived(held ? taxLabelsHref(currentSearch(), plan) : null)
</script>

<!-- A new income in a taxed plan has no label yet, and the tax rules read only labelled income. The status stays
     mounted, so a screen reader hears the sentence when a save offers it. -->
<div role="status">
	{#if href !== null}
		<p class="text-sm text-muted-foreground">{next ? "Next: give your income its tax labels in" : "Give this income a label in"} <a {href} onclick={() => taxLabelNotice.clear()} class="underline underline-offset-4">Tax labels</a>.</p>
	{/if}
</div>
