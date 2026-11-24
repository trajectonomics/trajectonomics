<script lang="ts">
import { fieldKey } from "../../lib/view/assumptions/draft"
import type { Shown } from "../../lib/view/plan-items/problems"
import Field from "../plan-items/Field.svelte"
import AccountFee from "./AccountFee.svelte"
import SwingChoices from "./SwingChoices.svelte"

interface Props {
	/** The Account's id, which names the row and each field. */
	id: string
	/** Whether the Account has a volatility field: an illiquid asset has none. */
	swings: boolean
	/** The text of its return and of its volatility; an empty volatility is none. */
	rate: string
	volatility: string
	/** The fee's share and rounding, for a liquid asset. */
	feeRate: string
	feeRounding: string
	shown: Shown
	disabled?: boolean
}

let {
	id,
	swings,
	rate = $bindable(),
	volatility = $bindable(),
	feeRate = $bindable(),
	feeRounding = $bindable(),
	shown,
	disabled = false,
}: Props = $props()
</script>

<!-- One asset Account. An illiquid asset shows its return only: the chance of success moves only what can be sold. -->
<div class="space-y-4 rounded-md border border-border p-4">
	<h3 class="font-medium text-foreground">{id}</h3>
	<div class="grid gap-4 sm:grid-cols-2">
		<Field
			id="rate-{id}"
			label="Expected return a year"
			inputmode="decimal"
			hint="A percent, such as 3.50"
			bind:value={rate}
			problem={shown.at(fieldKey("rate", id))}
			{disabled}
		/>
		{#if swings}
			<Field
				id="volatility-{id}"
				label="How much it swings"
				inputmode="decimal"
				hint="A percent a year, such as 15"
				bind:value={volatility}
				problem={shown.at(fieldKey("volatility", id))}
				{disabled}
			/>
		{/if}
	</div>
	{#if swings}
		{#if volatility.trim() === ""}
			<p class="text-sm text-muted-foreground">Empty: fixed at its return in every path.</p>
		{/if}
		{#if !disabled}<SwingChoices forId="volatility-{id}" bind:value={volatility} />{/if}
		<AccountFee
			{id}
			bind:rate={feeRate}
			bind:rounding={feeRounding}
			rateProblem={shown.at(fieldKey("feeRate", id))}
			roundingProblem={shown.at(fieldKey("feeRounding", id))}
			{disabled}
		/>
	{:else}
		<p class="text-sm text-muted-foreground">An asset you cannot sell at once shows its return only.</p>
	{/if}
</div>
