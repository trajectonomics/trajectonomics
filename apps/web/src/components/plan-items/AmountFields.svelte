<script lang="ts">
import type { AmountDraft } from "../../lib/view/plan-items/asset-draft"
import { type Choice, GROWTH_CHOICES } from "../../lib/view/plan-items/options"
import type { Shown } from "../../lib/view/plan-items/problems"
import Field from "./Field.svelte"

interface Props {
	draft: AmountDraft
	/** The draft's name in the form's problems and in its field ids: "running", "rent" or "saleCost". */
	prefix: string
	label: string
	choices: readonly Choice[]
	/** The label of the percent field. */
	percentLabel: string
	/** Whether a fixed amount grows each year: a monthly Flow does, a once one does not. */
	growing: boolean
	shown: Shown
}

let { draft = $bindable(), prefix, label, choices, percentLabel, growing, shown }: Props = $props()
</script>

<!-- One amount of an asset: not stated, a percent of its value, or a fixed amount. No percent is filled in. -->
<Field id="{prefix}-mode" {label} options={choices} bind:value={draft.mode} problem={shown.at(`${prefix}.mode`)} />
{#if draft.mode === "percent"}
	<Field id="{prefix}-rate" label={percentLabel} inputmode="decimal" hint="Your own estimate: a percent with at most two places, such as 1.5" bind:value={draft.rate} problem={shown.at(`${prefix}.rate`)} />
{:else if draft.mode === "amount"}
	<Field id="{prefix}-amount" label="Amount" inputmode="decimal" money hint="A decimal number, such as 9000.50" bind:value={draft.amount} problem={shown.at(`${prefix}.amount`)} />
	{#if growing}
		<Field id="{prefix}-growth" label="Growth" options={GROWTH_CHOICES} bind:value={draft.growth} problem={shown.at(`${prefix}.growth`)} />
		{#if draft.growth === "fixed"}
			<Field id="{prefix}-growth-rate" label="Percent a year" inputmode="decimal" hint="Your own estimate: up to two places, such as 3 or 3.50" bind:value={draft.growthRate} problem={shown.at(`${prefix}.growthRate`)} />
		{/if}
	{/if}
{/if}
