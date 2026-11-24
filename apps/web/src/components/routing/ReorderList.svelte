<script lang="ts" generics="T">
import type { Snippet } from "svelte"
import { Reorder } from "../../client/reorder.svelte.js"
import OrderRow from "./OrderRow.svelte"

interface Props {
	/** The list as saved. */
	items: readonly T[]
	/** What each row is called to a screen reader. */
	labelOf: (item: T, order: readonly T[], index: number) => string
	editable: boolean
	busy: boolean
	/** The rule the order breaks, with the row it lands on, or null. */
	rule: (order: readonly T[]) => { index: number; message: string } | null
	/** The CLI's refusal at a row of the order that was sent, or undefined. */
	refused: (index: number) => string | undefined
	/** Saves the order as one Edit. True when it ran. */
	onSave: (order: readonly T[]) => Promise<boolean>
	onTry: (order: readonly T[]) => void
	row: Snippet<[T, number, readonly T[]]>
	/** The buttons after Up and Down: edit, try, remove. */
	buttons?: Snippet<[T, number]>
}

let { items, labelOf, editable, busy, rule, refused, onSave, onTry, row, buttons }: Props = $props()
const initial = () => items
const reorder = new Reorder<T>(initial())
const broken = $derived(rule(reorder.order))
const changed = $derived(reorder.changed(items))
const button =
	"rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50"

async function dropped(event: DragEvent, index: number): Promise<void> {
	const order = reorder.drop(event, index)
	if (order !== null && rule(order) === null) await onSave(order)
}
</script>

<ol class="space-y-2">
	{#each reorder.order as item, index (index)}
		<OrderRow {index} count={reorder.order.length} label={labelOf(item, reorder.order, index)} {reorder} {editable}
			problem={broken?.index === index ? broken.message : refused(index)} onDrop={dropped}>
			{@render row(item, index, reorder.order)}
			{#snippet actions()}{@render buttons?.(item, index)}{/snippet}
		</OrderRow>
	{/each}
</ol>
{#if editable && changed}
	<div class="flex flex-wrap items-center gap-2" role="group" aria-label="The new order">
		<span class="text-sm text-muted-foreground">The new order is not saved yet.</span>
		<button type="button" class={button} disabled={busy || broken !== null} onclick={() => onSave(reorder.order)}>Done</button>
		<button type="button" class={button} disabled={busy || broken !== null} onclick={() => onTry(reorder.order)}>Try this order</button>
		<button type="button" class={button} onclick={() => reorder.reset(items)}>Cancel</button>
	</div>
{/if}
