<script lang="ts">
import { currentItemNames } from "../../client/item-names.svelte.js"
import type { HouseholdAnchor } from "../../lib/contract"
import { anchorRow } from "../../lib/view/item-names"
import ItemName from "../ui/ItemName.svelte"

interface Props {
	anchors: readonly HouseholdAnchor[]
	editable: boolean
	/** Removes the anchor of a path. The dates it pinned stay as they are. */
	onRemove: (path: string) => void
}

let { anchors, editable, onRemove }: Props = $props()
const rows = $derived(anchors.map((anchor) => anchorRow(anchor, currentItemNames())))
</script>

<ul class="space-y-2 text-sm">
	{#each rows as row (row.path)}
		<li class="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2">
			<span>
				{#if row.target !== null}
					<ItemName kind={row.target.kind} id={row.target.id} /> {row.edge}
				{:else}
					<code class="font-mono break-all">{row.path}</code>
				{/if}
				<span class="text-muted-foreground">{row.when}</span>
			</span>
			{#if editable}
				<button
					type="button"
					aria-label="Remove the anchor of {row.plain}"
					onclick={() => onRemove(row.path)}
					class="shrink-0 rounded-md border border-border px-2.5 py-1 text-foreground outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
				>
					Remove
				</button>
			{/if}
		</li>
	{/each}
</ul>
