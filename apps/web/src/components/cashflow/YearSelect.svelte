<script lang="ts">
import { type Rollup, yearLabel } from "../../lib/view/cashflow/cashflow"

interface Props {
	/** The Annual roll-ups of the Scenario, one entry each. */
	rollups: readonly Rollup[]
	/** The index of the roll-up the page shows. */
	selected: number
	onYear: (index: string) => void
}

/** The year picker: one entry per Annual roll-up, labelled by its span, its ages and a partial year. */
let { rollups, selected, onYear }: Props = $props()
</script>

<label class="flex max-w-full flex-col gap-1 text-sm">
	<span class="text-muted-foreground">Year</span>
	<select
		name="year"
		value={String(selected)}
		onchange={(event) => onYear(event.currentTarget.value)}
		class="w-full max-w-xl rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus-visible:outline-2 focus-visible:outline-ring"
	>
		{#each rollups as rollup (rollup.index)}
			<option value={String(rollup.index)}>{yearLabel(rollup)}</option>
		{/each}
	</select>
</label>
