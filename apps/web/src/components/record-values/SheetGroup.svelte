<script lang="ts">
import type { SheetGroup } from "../../lib/view/record-values/types"
import ValueRow from "./ValueRow.svelte"

interface Props {
	group: SheetGroup
	since: string | null
}

let { group, since }: Props = $props()
</script>

<!-- One group of accounts: the assets under one top-level account, or the debts. -->
<section aria-labelledby="value-group-{group.key}" class="min-w-0 space-y-1">
	<h3 id="value-group-{group.key}" class="text-sm font-semibold text-foreground">{group.title}</h3>
	<ul class="min-w-0 divide-y divide-border">
		{#each group.rows as row (row.id)}
			<ValueRow {row} {since} />
		{/each}
	</ul>
</section>
