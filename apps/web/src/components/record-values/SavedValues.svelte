<script lang="ts">
import type { SavedView } from "../../lib/view/record-values/saved"
import Money from "../ui/Money.svelte"

interface Props {
	view: SavedView
	onDone: () => void
}

let { view, onDone }: Props = $props()
</script>

<!-- What traj stated for each value: before and after, and the difference it wrote, then Done. -->
<div class="min-w-0 space-y-6">
	<p role="status" class="text-sm text-foreground">{view.summary}</p>
	<ul class="min-w-0 divide-y divide-border">
		{#each view.rows as row (row.key)}
			<li class="min-w-0 space-y-1 py-3 text-sm">
				<p class="truncate font-medium text-foreground">{row.name}</p>
				<p class="flex flex-wrap items-baseline gap-x-2">
					<Money amount={row.before} currency={row.currency} />
					<span aria-hidden="true">→</span><span class="sr-only">to</span>
					<Money amount={row.value} currency={row.currency} />
				</p>
				<p class="text-xs text-muted-foreground">
					{#if row.written}{row.owed ? "Change in what you owe" : "Difference"} <Money amount={row.difference} currency={row.currency} />{:else}No change, nothing written{/if}
				</p>
				{#each row.notes as note (note)}<p class="text-xs text-muted-foreground">{note}</p>{/each}
			</li>
		{/each}
	</ul>
	<button
		type="button"
		onclick={onDone}
		class="rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
	>
		Done
	</button>
</div>
