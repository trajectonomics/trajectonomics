<script lang="ts">
import type { HouseholdAnchor } from "../../lib/contract"
import { anchorLabel } from "../../lib/view/household/model"

interface Props {
	anchors: readonly HouseholdAnchor[]
	editable: boolean
	/** Removes the anchor of a path. The dates it pinned stay as they are. */
	onRemove: (path: string) => void
}

let { anchors, editable, onRemove }: Props = $props()
</script>

<ul class="space-y-2 text-sm">
	{#each anchors as anchor (anchor.path)}
		<li class="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2">
			<span>
				<span class="font-mono break-all">{anchor.path}</span>
				<span class="text-muted-foreground">{anchorLabel(anchor)}</span>
			</span>
			{#if editable}
				<button
					type="button"
					aria-label="Remove the anchor of {anchor.path}"
					onclick={() => onRemove(anchor.path)}
					class="shrink-0 rounded-md border border-border px-2.5 py-1 text-foreground outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
				>
					Remove
				</button>
			{/if}
		</li>
	{/each}
</ul>
