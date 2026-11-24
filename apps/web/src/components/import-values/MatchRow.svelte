<script lang="ts">
import { importSession as session } from "../../client/import-values.svelte.js"
import { SKIP, type Target } from "../../lib/view/import-values/match"
import type { ImportSource } from "../../lib/view/import-values/types"
import { OWED_NOTE, sourceLine } from "../../lib/view/import-values/words"

interface Props {
	source: ImportSource
	/** The account's place in the table, which names its select: a name may be in any script. */
	index: number
	targets: readonly Target[]
}

let { source, index, targets }: Props = $props()
const id = $derived(`import-match-${index}`)
const owed = $derived(
	targets.find((target) => target.id === session.matches[source.key])?.owed ?? false,
)
const groups = $derived([...new Set(targets.map((target) => target.group))])
</script>

<!-- One account of the table: its name, how many values it holds and their dates, and a choice of ledger account. -->
<li class="min-w-0 space-y-1.5 py-3">
	<label for={id} class="block truncate text-sm font-medium text-foreground">{source.label}</label>
	<p class="text-xs text-muted-foreground">{sourceLine(source)}</p>
	<select
		{id}
		value={session.matches[source.key] ?? ""}
		onchange={(event) => session.choose(source.key, event.currentTarget.value)}
		class="w-full min-w-0 rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus-visible:outline-2 focus-visible:outline-ring"
	>
		<option value="">Choose an account</option>
		<option value={SKIP}>Skip</option>
		{#each groups as group (group)}
			<optgroup label={group}>
				{#each targets.filter((target) => target.group === group) as target (target.id)}
					<option value={target.id}>{target.name}</option>
				{/each}
			</optgroup>
		{/each}
	</select>
	{#if owed}<p class="text-xs text-muted-foreground">{OWED_NOTE}</p>{/if}
</li>
