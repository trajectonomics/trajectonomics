<script lang="ts">
import type { AssetDraft } from "../../lib/view/plan-items/asset-draft"
import { SALE_COST_CHOICES, SELLING_CHOICES } from "../../lib/view/plan-items/asset-options"
import type { Shown } from "../../lib/view/plan-items/problems"
import AmountFields from "./AmountFields.svelte"
import AnchoredDate from "./AnchoredDate.svelte"
import Field from "./Field.svelte"

interface Props {
	draft: AssetDraft
	shown: Shown
	/** The household's label of the sale date when it pins it, and the plan the link names. */
	anchor: string | null
	plan: string
}

let { draft = $bindable(), shown, anchor, plan }: Props = $props()
</script>

<!-- Selling it: all of it is sold at its value on a date. Running costs, rent and loan payments end the day before. -->
<fieldset class="space-y-4 border-t border-border pt-4">
	<legend class="text-sm font-semibold text-foreground">Selling it</legend>
	<Field id="asset-selling" label="Selling" options={SELLING_CHOICES} bind:value={draft.selling} problem={shown.at("selling")} />
	{#if draft.selling === "date"}
		<AnchoredDate id="asset-sale-date" label="Sold on" bind:value={draft.saleDate} problem={shown.at("saleDate")} {anchor} {plan} />
		<AmountFields bind:draft={draft.saleCost} prefix="saleCost" label="Selling costs" choices={SALE_COST_CHOICES} percentLabel="Percent of its value" growing={false} {shown} />
		<p class="text-xs text-muted-foreground">Its running costs, its rent and its loan payments end the day before. A loan is repaid from the sale.</p>
	{/if}
</fieldset>
