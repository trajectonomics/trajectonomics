<script lang="ts">
import { valueSheetSession as session } from "../../client/record-values.svelte.js"
import type { SheetRow } from "../../lib/view/record-values/types"
import { lastLine, OWED_HINT } from "../../lib/view/record-values/words"
import Money from "../ui/Money.svelte"

interface Props {
	row: SheetRow
	since: string | null
}

let { row, since }: Props = $props()
const typed = $derived(session.values[row.id] ?? "")
const changed = $derived(typed.trim() !== "")
const problem = $derived(session.problems.rows[row.id])
const describedBy = $derived(
	problem ? `value-${row.id}-problem` : row.owed ? `value-${row.id}-owed` : undefined,
)
</script>

<!-- One account: its last Balance, the date of its last Transaction, and a field for today's value. -->
<li class="min-w-0 space-y-1.5 py-3 {changed ? 'border-l-2 border-foreground pl-3' : ''}" data-changed={changed ? "true" : undefined}>
	<div class="flex items-baseline justify-between gap-3">
		<label for="value-{row.id}" class="min-w-0 truncate text-sm font-medium text-foreground">{row.name}</label>
		<span class="shrink-0 text-sm">
			{#if row.balance !== null}<Money amount={row.balance} currency={row.currency} />{:else}<span class="text-muted-foreground">No balance</span>{/if}
		</span>
	</div>
	<p class="text-xs text-muted-foreground">{lastLine(row, since)}</p>
	<input
		id="value-{row.id}"
		value={typed}
		oninput={(event) => (session.values[row.id] = event.currentTarget.value)}
		inputmode="decimal"
		autocomplete="off"
		aria-invalid={problem ? "true" : undefined}
		aria-describedby={describedBy}
		class="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus-visible:outline-2 focus-visible:outline-ring"
	/>
	{#if row.owed}<p id="value-{row.id}-owed" class="text-xs text-muted-foreground">{OWED_HINT}</p>{/if}
	{#if problem}<p id="value-{row.id}-problem" role="alert" class="text-sm text-destructive">{problem}</p>{/if}
</li>
