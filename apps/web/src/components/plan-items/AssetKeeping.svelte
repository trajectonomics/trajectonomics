<script lang="ts">
import type { AssetDraft } from "../../lib/view/plan-items/asset-draft"
import { RUNNING_CHOICES } from "../../lib/view/plan-items/asset-options"
import { ROUNDING_CHOICES } from "../../lib/view/plan-items/options"
import type { Shown } from "../../lib/view/plan-items/problems"
import AmountFields from "./AmountFields.svelte"
import Field from "./Field.svelte"

interface Props {
	draft: AssetDraft
	shown: Shown
}

let { draft = $bindable(), shown }: Props = $props()
const computed = $derived(
	[draft.running, draft.rent, ...(draft.selling === "date" ? [draft.saleCost] : [])].some(
		(part) => part.mode === "percent",
	),
)
</script>

<!-- Keeping it: running costs, and the rounding every amount computed from its value takes. Neither has a default. -->
<fieldset class="space-y-4 border-t border-border pt-4">
	<legend class="text-sm font-semibold text-foreground">Keeping it</legend>
	{#if draft.ownership === "owned"}
		<Field id="asset-from" label="Its costs and rent start on" hint="YYYY-MM-DD" bind:value={draft.from} problem={shown.at("from")} />
	{/if}
	{#if draft.ownership === "buy"}
		<p class="text-xs text-muted-foreground">Running costs and rent start one month after the purchase, because the first month reads the value before it is bought.</p>
	{/if}
	<AmountFields bind:draft={draft.running} prefix="running" label="Running costs" choices={RUNNING_CHOICES} percentLabel="Percent of its value a year" growing {shown} />
	{#if draft.running.mode !== "none"}
		<Field id="asset-category" label="Expense category" hint="Groups its running costs on the Expenses page. Optional." bind:value={draft.category} problem={shown.at("category")} />
	{/if}
	{#if computed}
		<Field id="asset-rounding" label="Each amount computed from its value rounds" options={ROUNDING_CHOICES} bind:value={draft.rounding} problem={shown.at("rounding")} />
	{/if}
</fieldset>
