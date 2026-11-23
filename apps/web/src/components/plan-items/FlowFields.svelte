<script lang="ts">
import type { ScenarioFlow } from "../../lib/contract"
import { householdHref } from "../../lib/view/household/model"
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
	/** The plan's name, which the household link names. */
	name: string
	/** The label of each date the household pins, or null for a date it does not pin. */
	anchors: { start: string | null; end: string | null }
	/** The categories the plan's expenses already use: suggestions only, never a preset list. */
	categories?: readonly string[]
}

let { draft = $bindable(), kind, existing, shown, name, anchors, categories = [] }: Props = $props()
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
	<Field id="flow-start" label="Starts" hint="YYYY-MM-DD" bind:value={draft.start} problem={shown.at("start")} disabled={anchors.start !== null} />
	{#if anchors.start !== null}<p class="-mt-3 text-sm text-muted-foreground">Set by the household {anchors.start}: <a class="underline" href={householdHref(name, "")}>change it there</a>.</p>{/if}
	<Field id="flow-end" label="Ends" hint="YYYY-MM-DD, or empty to run to the horizon" bind:value={draft.end} problem={shown.at("end")} disabled={anchors.end !== null} />
	{#if anchors.end !== null}<p class="-mt-3 text-sm text-muted-foreground">Set by the household {anchors.end}: <a class="underline" href={householdHref(name, "")}>change it there</a>.</p>{/if}
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
	{#if kind === "expense"}
		<div class="space-y-1.5">
			<label for="flow-category" class="block text-sm font-medium text-foreground">Category</label>
			<p id="flow-category-hint" class="text-xs text-muted-foreground">Groups this expense on the Expenses page. Optional.</p>
			<input id="flow-category" list="flow-categories" bind:value={draft.category} autocomplete="off" aria-invalid={shown.at("category") ? "true" : undefined} aria-describedby="flow-category-hint" class="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus-visible:outline-2 focus-visible:outline-ring" />
			<datalist id="flow-categories">
				{#each categories as category (category)}<option value={category}></option>{/each}
			</datalist>
			{#if shown.at("category")}<p role="alert" class="text-sm text-destructive">{shown.at("category")}</p>{/if}
		</div>
	{/if}
	{#if shown.general}<p role="alert" class="text-sm text-destructive">{shown.general}</p>{/if}
</div>
