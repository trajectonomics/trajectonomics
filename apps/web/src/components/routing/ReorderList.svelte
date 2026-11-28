<script lang="ts" generics="T">
import type { Snippet } from "svelte"
import { Reorder } from "../../client/reorder.svelte.js"
import { origins } from "../../lib/view/routing/order"
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
	/**
	 * The buttons after Up and Down: edit, try, remove. Their number is the row's index in `items`, the list the page
	 * saves, so a button acts on the item the row shows even after an order that is not saved yet.
	 */
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
/** The order the last save stored, while the page still shows the Snapshot from before it (a write that landed unread). */
let stored = $state<readonly T[] | null>(null)
const baseline = $derived(stored ?? items)
/** Each shown row's place in `items`: the rows hold every item of `items`, so one of them is the row's own. */
const saved = $derived(origins(items, reorder.items))
const broken = $derived(rule(reorder.items))
const changed = $derived(reorder.changed(baseline))
const cannot = $derived(busy || broken !== null || locked)
const button =
	"rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50"

async function save(order: readonly T[]): Promise<void> {
	if (await onSave(order)) stored = order
}

async function dropped(event: DragEvent, index: number): Promise<void> {
	const order = reorder.drop(event, index)
	if (order !== null && rule(order) === null && !locked) await save(order)
}
</script>

<ol class="space-y-2">
	{#each reorder.rows as entry, index (entry.key)}
		<OrderRow rowKey={entry.key} {index} count={reorder.rows.length} label={labelOf(entry.item, reorder.items, index)} {reorder} {editable}
			problem={broken?.index === index ? broken.message : refused(index)} onDrop={dropped}>
			{@render row(entry.item, index, reorder.items)}
			{#snippet actions()}{@render buttons?.(entry.item, saved[index] ?? index)}{/snippet}
		</OrderRow>
	{/each}
</ol>
{#if editable && changed}
	<div class="flex flex-wrap items-center gap-2" role="group" aria-label="The new order">
		<span class="text-sm text-muted-foreground">The new order is not saved yet.</span>
		<button type="button" class={button} disabled={cannot} onclick={() => save(reorder.items)}>Done</button>
		<button type="button" class={button} disabled={busy || broken !== null} onclick={() => onTry(reorder.items)}>Try this order</button>
		<button type="button" class={button} onclick={() => reorder.reset(baseline)}>Cancel</button>
	</div>
{/if}
