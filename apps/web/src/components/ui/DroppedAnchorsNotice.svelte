<script lang="ts">
import { dismissDropped, dropped } from "../../client/dropped-anchors.svelte.js"

const message = $derived.by(() => {
	const some = dropped.anchors
	const one = some.length === 1
	return `This change removed the household ${one ? "anchor" : "anchors"} that pinned ${some.join(", ")}, because the plan no longer holds ${one ? "that date" : "those dates"}.`
})
const button =
	"rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
</script>

<!-- Shown after a plan write dropped household anchors, because the item they pinned is gone (cli ADR-0048). -->
{#if dropped.anchors.length > 0}
	<div role="status" class="mb-6 print:hidden space-y-3 rounded-md border border-border bg-muted p-3">
		<p class="text-sm text-foreground">{message}</p>
		<button type="button" onclick={() => dismissDropped()} class={button}>Dismiss</button>
	</div>
{/if}
