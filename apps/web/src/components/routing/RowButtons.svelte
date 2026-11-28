<script lang="ts">
interface Props {
	/** The place the row shows, which names it to a screen reader, such as "entry 1". */
	label: string
	busy: boolean
	/** True while the what-if changes the list: saving would carry the try into the plan, so Edit and Remove wait. */
	locked?: boolean
	onEdit: () => void
	onTry: () => void
	/** Removes the row, and says whether that ran: true also for a write that landed and could not be read again. */
	onRemove: () => boolean | Promise<boolean>
	onTryRemove: () => void
}

let { label, busy, locked = false, onEdit, onTry, onRemove, onTryRemove }: Props = $props()
let confirming = $state(false)
const button =
	"rounded-md border border-border bg-card px-2 py-1 text-xs text-foreground outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-40"

/** A removal that ran disarms the row, which may stay on the page until a Reload; a refused one stays armed. */
async function remove(): Promise<void> {
	if (await onRemove()) confirming = false
}
</script>

<!-- Edit saves the row, Try puts a value in the What-if session, Remove asks first because a removed row cannot be brought back here. -->
{#if confirming}
	<button type="button" class={button} disabled={busy || locked} onclick={remove}>Remove{" "}<span class="sr-only">{label}</span></button>
	<button type="button" class={button} disabled={busy} onclick={onTryRemove}>Try removing{" "}<span class="sr-only">{label}</span></button>
	<button type="button" class={button} onclick={() => (confirming = false)}>Keep{" "}<span class="sr-only">{label}</span></button>
{:else}
	<button type="button" class={button} disabled={locked} onclick={onEdit}>Edit{" "}<span class="sr-only">{label}</span></button>
	<button type="button" class={button} onclick={onTry}>Try{" "}<span class="sr-only">a value for {label}</span></button>
	<button type="button" class={button} onclick={() => (confirming = true)}>Remove…{" "}<span class="sr-only">{label}</span></button>
{/if}
