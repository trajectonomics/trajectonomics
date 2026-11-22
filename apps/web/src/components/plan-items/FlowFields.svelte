<script lang="ts">
import type { ScenarioFlow } from "../../lib/contract"
import type { FlowDraft, FlowKind } from "../../lib/view/plan-items/flows"
import { FREQUENCY_CHOICES, GROWTH_CHOICES } from "../../lib/view/plan-items/options"
import type { Shown } from "../../lib/view/plan-items/problems"
import Field from "./Field.svelte"

interface Props {
	draft: FlowDraft
	kind: FlowKind
	/** The Flow being edited; absent for a new one, whose name becomes its id. */
	existing?: ScenarioFlow | undefined
	shown: Shown
}

let { draft = $bindable(), kind, existing, shown }: Props = $props()
</script>

<!-- The fields of a Flow. Its amount is text, sent as the person typed it, after its commas are removed. -->
<div class="space-y-4">
	{#if existing}
		<p class="text-sm text-foreground">Item <span class="font-medium">{existing.id}</span></p>
	{:else}
		<Field id="flow-name" label="Name" bind:value={draft.name} problem={shown.at("name")} />
	{/if}
	<Field id="flow-amount" label="Amount per occurrence" inputmode="decimal" hint="A decimal number, such as 9000.50" bind:value={draft.amount} problem={shown.at("amount")} />
	<Field id="flow-frequency" label="How often" options={FREQUENCY_CHOICES} bind:value={draft.frequency} problem={shown.at("frequency")} />
	<Field id="flow-start" label="Starts" hint="YYYY-MM-DD" bind:value={draft.start} problem={shown.at("start")} />
	<Field id="flow-end" label="Ends" hint="YYYY-MM-DD, or empty to run to the horizon" bind:value={draft.end} problem={shown.at("end")} />
	<Field id="flow-growth" label="Growth" options={GROWTH_CHOICES} bind:value={draft.growth} problem={shown.at("growth")} />
	{#if draft.growth === "fixed"}
		<Field id="flow-rate" label="Percent a year" inputmode="decimal" hint="Up to two places, such as 3 or 3.50" bind:value={draft.rate} problem={shown.at("rate")} />
	{/if}
	{#if kind === "income"}
		<label class="flex items-center gap-2 text-sm text-foreground">
			<input type="checkbox" bind:checked={draft.earned} class="size-4" />
			Earned income: it stops when earning stops
		</label>
		{#if shown.at("earned")}<p role="alert" class="text-sm text-destructive">{shown.at("earned")}</p>{/if}
	{/if}
	{#if shown.general}<p role="alert" class="text-sm text-destructive">{shown.general}</p>{/if}
</div>
