<script lang="ts">
import { currentSearch } from "../../client/location.svelte.js"
import { taxLabelNotice, taxLabelsHref } from "../../client/tax-label-notice.svelte.js"
import type { ScenarioDocument } from "../../lib/contract"
import { heldTaxLabel } from "../../lib/view/plan-items/tax-label"

interface Props {
	/** The plan the Income page shows, which the notice must still name. */
	plan: string
	/** The plan's document, which says whether the Flow still needs its label. */
	doc: ScenarioDocument
}

let { plan, doc }: Props = $props()
const held = $derived(heldTaxLabel(taxLabelNotice.held, plan, doc))
const href = $derived(held ? taxLabelsHref(currentSearch(), plan) : null)
</script>

<!-- A new income in a taxed plan has no label yet, and the tax rules read only labelled income. The status stays
     mounted, so a screen reader hears the sentence when a save offers it. -->
<div role="status">
	{#if href !== null}
		<p class="text-sm text-muted-foreground">Give this income a label in <a {href} onclick={() => taxLabelNotice.clear()} class="underline underline-offset-4">Tax labels</a>.</p>
	{/if}
</div>
