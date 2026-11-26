<script lang="ts">
import { isFlatClaim } from "../../lib/view/tax-settings/claims"
import type { GroupCard, GroupKey } from "../../lib/view/tax-settings/groups"
import TaxProfileRows from "./TaxProfileRows.svelte"

interface Props {
	cards: readonly GroupCard[]
	/** Opens the drawer on one group; absent when the page changes nothing (no server, or the Demo). */
	onEdit?: ((group: GroupKey) => void) | undefined
	/** True while an Edit runs or a What-if session is open: the buttons stay, and wait. */
	disabled: boolean
	/** True after a holder swap, when a card of only flat claims waits for `--from-stored`. */
	locked?: boolean
	/** Whether the shared home-loan interest field is offered: without it, a swapped Home card has nothing to edit. */
	sharedClaimable?: boolean
}

let { cards, onEdit, disabled, locked = false, sharedClaimable = true }: Props = $props()
const button =
	"rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50"

/** A card whose Edit would send a bare value after a swap, or whose only writable field (the shared interest) is not offered. */
function waits(card: GroupCard): boolean {
	if (!locked) return false
	if (card.rows.every((row) => isFlatClaim(row.key))) return true
	return card.key === "home" && !sharedClaimable
}
</script>

<!-- One card per group of the stored request, each with its own Edit, one column on a phone and two beside each other from a tablet up. -->
<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
	{#each cards as card (card.key)}
		<article aria-label={card.title} class="min-w-0 space-y-3 rounded-lg border border-border bg-card p-4">
			<h3 class="text-sm font-semibold">{card.title}</h3>
			<TaxProfileRows rows={card.rows} />
			{#if onEdit}
				<button type="button" disabled={disabled || waits(card)} onclick={() => onEdit(card.key)} class={button}>Edit {card.title.toLowerCase()}</button>
			{/if}
		</article>
	{/each}
</div>
