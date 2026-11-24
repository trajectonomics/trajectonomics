<script lang="ts">
interface Props {
	/** True while an Edit or a reread runs: both buttons wait. */
	busy: boolean
	/** Puts the changed values in the What-if session instead of saving them. */
	ontry: () => void
}

let { busy, ontry }: Props = $props()
const button =
	"rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50"
</script>

<div class="flex flex-wrap gap-2 border-t border-border pt-4">
	<button type="submit" disabled={busy} class={button}>Save</button>
	<button type="button" disabled={busy} onclick={ontry} class={button}>Try as what-if</button>
</div>
