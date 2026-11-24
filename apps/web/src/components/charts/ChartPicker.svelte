<script lang="ts">
import type { ChartDef } from "../../lib/view/charts/types"

/** The value of the "New chart" option, which opens the drawer and is never kept as the choice. */
const NEW = "__new"

interface Props {
	/** The chart's heading id, which the section is named by. */
	id: string
	charts: readonly ChartDef[]
	/** The id of the chosen custom chart, or "" for the net worth chart. */
	value: string
	onChange: (id: string) => void
	onNew: () => void
}

let { id, charts, value, onChange, onNew }: Props = $props()

function choose(event: Event & { currentTarget: HTMLSelectElement }): void {
	const picked = event.currentTarget.value
	if (picked !== NEW) {
		onChange(picked)
		return
	}
	event.currentTarget.value = value
	onNew()
}
</script>

<!-- The chart's title is its picker: the net worth chart, the person's own charts, then a new one. -->
<h2 {id} class="max-w-full min-w-0 text-base font-semibold">
	<label class="sr-only" for="{id}-select">Chart</label>
	<select
		id="{id}-select"
		{value}
		onchange={choose}
		class="w-full min-w-0 max-w-full truncate rounded-md border border-border bg-card px-2 py-1 text-base font-semibold outline-none focus-visible:outline-2 focus-visible:outline-ring"
	>
		<option value="">Net worth by year</option>
		{#if charts.length > 0}
			<optgroup label="My charts">
				{#each charts as chart (chart.id)}
					<option value={chart.id}>{chart.name}</option>
				{/each}
			</optgroup>
		{/if}
		<option value={NEW}>New chart…</option>
	</select>
</h2>
