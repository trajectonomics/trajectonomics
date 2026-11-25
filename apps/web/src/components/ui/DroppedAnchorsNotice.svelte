<script lang="ts">
import { dismissDropped, dropped } from "../../client/dropped-anchors.svelte.js"

const change = $derived(
	dropped.plan === null ? "This change" : `This change to plan ${dropped.plan}`,
)

const anchorMessage = $derived.by(() => {
	const some = dropped.anchors
	const one = some.length === 1
	return `${change} removed the household ${one ? "anchor" : "anchors"} that pinned ${some.join(", ")}, because the plan no longer holds ${one ? "that date" : "those dates"}.`
})

const ownerMessage = $derived.by(() => {
	const some = dropped.owners
	const one = some.length === 1
	const owned = some.map((path) => `the Owner of ${path}`)
	const list = one
		? (owned[0] ?? "")
		: `${owned.slice(0, -1).join(", ")} and ${owned[owned.length - 1] ?? ""}`
	return `${change} removed ${list}, because the plan no longer holds ${one ? "that item" : "those items"}.`
})

const button =
	"rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
</script>

<!-- Shown after a plan write dropped household anchors or Owners, because the item they pinned or owned is gone (cli ADR-0048, ADR-0076). -->
{#if dropped.anchors.length > 0 || dropped.owners.length > 0}
	<div role="status" class="mb-6 print:hidden space-y-3 rounded-md border border-border bg-muted p-3">
		{#if dropped.anchors.length > 0}
			<p class="text-sm text-foreground">{anchorMessage}</p>
		{/if}
		{#if dropped.owners.length > 0}
			<p class="text-sm text-foreground">{ownerMessage}</p>
		{/if}
		<button type="button" onclick={() => dismissDropped()} class={button}>Dismiss</button>
	</div>
{/if}
