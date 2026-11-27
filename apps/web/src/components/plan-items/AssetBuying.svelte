<script lang="ts">
import type { AssetDraft } from "../../lib/view/plan-items/asset-draft"
import { PAYING_CHOICES } from "../../lib/view/plan-items/asset-options"
import type { Shown } from "../../lib/view/plan-items/problems"
import AnchoredDate from "./AnchoredDate.svelte"
import Field from "./Field.svelte"
import LoanTermsFields from "./LoanTermsFields.svelte"

interface Props {
	draft: AssetDraft
	shown: Shown
	/** The household's label of the purchase date when it pins it, and the plan the link names. */
	anchor: string | null
	plan: string
}

let { draft = $bindable(), shown, anchor, plan }: Props = $props()
</script>

<!-- Buying it: the date, the price and any costs, then how it is paid for. A loan is borrowed on the purchase date. -->
<fieldset class="space-y-4 border-t border-border pt-4">
	<legend class="text-sm font-semibold text-foreground">Buying it</legend>
	<AnchoredDate id="asset-purchase-date" label="Bought on" bind:value={draft.purchaseDate} problem={shown.at("purchaseDate")} {anchor} {plan} />
	<Field id="asset-price" label="Price" inputmode="decimal" money hint="A decimal number, such as 1500000.00" bind:value={draft.price} problem={shown.at("price")} />
	<Field id="asset-buy-cost" label="Buying costs" inputmode="decimal" money hint="An amount, or empty for none" bind:value={draft.buyCost} problem={shown.at("buyCost")} />
	<Field id="asset-paying" label="Paying for it" options={PAYING_CHOICES} bind:value={draft.paying} problem={shown.at("paying")} />
	{#if draft.paying === "loan"}
		<LoanTermsFields bind:draft={draft.loan} {shown} prefix="loan." />
	{/if}
</fieldset>
