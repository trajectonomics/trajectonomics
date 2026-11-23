<script lang="ts">
import type { LineDraft, ListName } from "../../lib/view/estate/draft"
import type { AccountChoice } from "../../lib/view/estate/options"
import type { Shown } from "../../lib/view/plan-items/problems"
import Field from "../plan-items/Field.svelte"
import LineFields from "./LineFields.svelte"

interface Props {
	line: LineDraft
	list: ListName
	index: number
	count: number
	accounts: readonly AccountChoice[]
	shown: Shown
	onMove: (by: -1 | 1) => void
	onRemove: () => void
}

/** One cost or gift: its name, its fields, and the controls that move it in the order or take it out. */
let { line = $bindable(), list, index, count, accounts, shown, onMove, onRemove }: Props = $props()
const prefix = $derived(`${list}.${index}`)
const noun = $derived(list === "costs" ? "cost" : "gift")
const button =
	"rounded-md border border-border bg-card px-2 py-1 text-sm text-foreground outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50"
</script>

<fieldset class="space-y-3 rounded-lg border border-border p-3">
	<legend class="px-1 text-sm font-medium">{line.id === "" ? `New ${noun}` : line.id}</legend>
	{#if line.id === ""}
		<Field id="estate-{list}-{index}-name" label="Name" hint="Such as settlement or court fees" bind:value={line.name} problem={shown.at(`${prefix}.name`)} />
	{/if}
	<LineFields bind:line {list} {prefix} {accounts} {shown} />
	<div class="flex flex-wrap gap-2">
		<button type="button" class={button} disabled={index === 0} aria-label="Move this {noun} up" onclick={() => onMove(-1)}>Move up</button>
		<button type="button" class={button} disabled={index === count - 1} aria-label="Move this {noun} down" onclick={() => onMove(1)}>Move down</button>
		<button type="button" class={button} aria-label="Remove this {noun}" onclick={onRemove}>Remove</button>
	</div>
</fieldset>
