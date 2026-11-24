<script lang="ts">
import type { CatalogueGroup } from "../../lib/view/charts/catalogue"
import { MAX_SERIES } from "../../lib/view/charts/types"

interface Props {
	groups: readonly CatalogueGroup[]
	/** The ids chosen, in order. */
	chosen: readonly string[]
	/** The name of a chosen id the plan does not list, so it can still be taken off. */
	names: ReadonlyMap<string, string>
	onToggle: (id: string) => void
}

let { groups, chosen, names, onToggle }: Props = $props()
const listed = $derived(new Set(groups.flatMap((group) => group.entries.map((entry) => entry.id))))
const unlisted = $derived(chosen.filter((id) => !listed.has(id)))
const full = $derived(chosen.length >= MAX_SERIES)
</script>

<!-- The series to plot, by group. A series this plan lacks is greyed out and says why; a chart holds at most eight. -->
<div class="space-y-4">
	{#each groups as group (group.id)}
		<fieldset class="space-y-1.5">
			<legend class="text-sm font-medium">{group.title}</legend>
			{#each group.entries as entry (entry.id)}
				{@const on = chosen.includes(entry.id)}
				<label class="flex items-start gap-2 text-sm {entry.available ? '' : 'text-muted-foreground'}">
					<input
						type="checkbox"
						checked={on}
						disabled={(!entry.available && !on) || (full && !on)}
						onchange={() => onToggle(entry.id)}
						class="mt-0.5"
					/>
					<span>
						{entry.name}{entry.real ? "" : " (nominal only)"}
						{#if !entry.available}<span class="block text-xs">{entry.reason}</span>{/if}
					</span>
				</label>
			{/each}
			{#each group.notes as note (note)}<p class="text-xs text-muted-foreground">{note}</p>{/each}
		</fieldset>
	{/each}
	{#if unlisted.length > 0}
		<fieldset class="space-y-1.5">
			<legend class="text-sm font-medium">Not in this Snapshot</legend>
			{#each unlisted as id (id)}
				<label class="flex items-start gap-2 text-sm text-muted-foreground">
					<input type="checkbox" checked onchange={() => onToggle(id)} class="mt-0.5" />
					<span>{names.get(id) ?? id}</span>
				</label>
			{/each}
		</fieldset>
	{/if}
	{#if full}<p class="text-xs text-muted-foreground">A chart holds at most {MAX_SERIES} series.</p>{/if}
</div>
