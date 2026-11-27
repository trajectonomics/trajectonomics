<script lang="ts">
import type { ItemKind } from "../../lib/view/item-names"
import ItemName from "../ui/ItemName.svelte"
import Money from "../ui/Money.svelte"

interface Props {
	/** What kind of item the card is, for the words a Read states for its name. */
	kind: ItemKind
	/** The item's id in the plan, which a Read may name. */
	id: string
	/** The CLI's amount, drawn compact; null when the card states words in its place. */
	amount?: string | null
	/** Words in the amount's place, such as a spending rule's share. */
	text?: string | null
	/** The one muted line under the name, or "" for none. */
	line?: string
	currency?: string | undefined
	/** Opens the item's full card in the drawer. */
	onOpen: () => void
}

/** One item as the Plan's compact card: its name and amount, and one line of what the full card states. */
let { kind, id, amount = null, text = null, line = "", currency, onOpen }: Props = $props()
</script>

<li class="min-w-0">
	<button
		type="button"
		aria-haspopup="dialog"
		data-plan-item
		onclick={onOpen}
		class="flex h-full w-full flex-col justify-start rounded-lg border border-border bg-card p-3 text-left hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
	>
		<span class="flex items-start justify-between gap-2">
			<span class="min-w-0 font-medium wrap-anywhere"><ItemName {kind} {id} /></span>
			<span class="shrink-0 text-sm">
				{#if amount !== null}
					<Money {amount} {currency} compact />
				{:else if text !== null}
					{text}
				{/if}
			</span>
		</span>
		{#if line !== ""}<span class="mt-1 block text-xs text-muted-foreground">{line}</span>{/if}
	</button>
</li>
