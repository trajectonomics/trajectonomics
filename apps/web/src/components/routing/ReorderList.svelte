<script lang="ts" generics="T">
import type { Snippet } from "svelte"
import { Reorder } from "../../client/reorder.svelte.js"
import OrderRow from "./OrderRow.svelte"

interface Props {
	/** The list as the page shows it: the session's own while a what-if holds a try. */
	items: readonly T[]
	/** What each row is called to a screen reader. */
	labelOf: (item: T, order: readonly T[], index: number) => string
	editable: boolean
	busy: boolean
	/** True while the what-if changes this list: a save would carry the try into the plan, so the page asks first. */
	locked?: boolean
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

let {
	items,
	labelOf,
	editable,
	busy,
	locked = false,
	rule,
	refused,
	onSave,
	onTry,
	row,
	buttons,
}: Props = $props()
const initial = () => items
const reorder = new Reorder<T>(initial())
const broken = $derived(rule(reorder.items))
const changed = $derived(reorder.changed(items))
const cannot = $derived(busy || broken !== null || locked)
const button =
	"rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50"

async function dropped(event: DragEvent, index: number): Promise<void> {
	const order = reorder.drop(event, index)
	if (order !== null && rule(order) === null && !locked) await onSave(order)
}
</script>

<ol class="space-y-2">
	{#each reorder.rows as entry, index (entry.key)}
		<OrderRow rowKey={entry.key} {index} count={reorder.rows.length} label={labelOf(entry.item, reorder.items, index)} {reorder} {editable}
			problem={broken?.index === index ? broken.message : refused(index)} onDrop={dropped}>
			{@render row(entry.item, index, reorder.items)}
			{#snippet actions()}{@render buttons?.(entry.item, index)}{/snippet}
		</OrderRow>
	{/each}
</ol>
{#if editable && changed}
	<div class="flex flex-wrap items-center gap-2" role="group" aria-label="The new order">
		<span class="text-sm text-muted-foreground">The new order is not saved yet.</span>
		<button type="button" class={button} disabled={cannot} onclick={() => onSave(reorder.items)}>Done</button>
		<button type="button" class={button} disabled={busy || broken !== null} onclick={() => onTry(reorder.items)}>Try this order</button>
		<button type="button" class={button} onclick={() => reorder.reset(items)}>Cancel</button>
	</div>
{/if}
