<script lang="ts">
import { currentSearch } from "../../client/location.svelte.js"
import { taxLabelNotice, taxLabelsHref } from "../../client/tax-label-notice.svelte.js"
import type { ScenarioDocument } from "../../lib/contract"
import {
	heldTaxLabel,
	heldTaxLabelOffer,
	heldTaxStep,
	type TaxLabelOrigin,
	taxLabelSentence,
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
const sentence = $derived(held ? taxLabelSentence(next, untaxed) : null)
const LINK =
	"underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
/** Following the drawer note clears it, as on #796. The guided step stays until every income of its plan is labelled. */
function follow(): void {
	if (!next) taxLabelNotice.clear()
}
let said = $state("")

// The status region mounts empty and takes the sentence after mount: one that arrives already holding its words is
// often skipped, as the tax step on Home was after a save. The sentence itself stays where people read it.
$effect(() => {
	said = sentence === null ? "" : `${sentence.lead}${sentence.link}${sentence.tail}`
})
</script>

<!-- A saved income in a taxed plan has no label yet, and the tax rules read only labelled income. The status stays
     mounted for a screen reader, and fills once the region is on the page. -->
<div>
	{#if sentence !== null}
		<p class="text-sm text-muted-foreground">
			{sentence.lead}{#if href !== null}<a {href} onclick={follow} class={LINK}>{sentence.link}</a>{/if}{sentence.tail}
		</p>
	{/if}
</div>
<p role="status" class="sr-only">{said}</p>
