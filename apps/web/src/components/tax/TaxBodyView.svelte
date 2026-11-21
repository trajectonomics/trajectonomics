<script lang="ts">
import type { ProjectionRun } from "../../lib/contract"
import { addLevyCommand, carryInRows, taxBody, taxStatusWords } from "../../lib/view/tax"
import Badge from "../ui/Badge.svelte"
import EmptyState from "../ui/EmptyState.svelte"
import CarryInTable from "./CarryInTable.svelte"
import TaxChart from "./TaxChart.svelte"
import TaxHeadline from "./TaxHeadline.svelte"
import TaxTable from "./TaxTable.svelte"

interface Props {
	name: string
	run: ProjectionRun
}

let { name, run }: Props = $props()
const body = $derived(taxBody(run))
const carry = $derived(carryInRows(run.carryIn ?? []))
</script>

<!-- One Scenario's projection as the Tax page shows it: its Levy's years, or the empty state. -->
<div class="space-y-8">
	<div class="flex flex-wrap items-center gap-2">
		<Badge>{taxStatusWords(run.tax)}</Badge>
	</div>
	{#if body.kind === "no-levy"}
		<EmptyState title="No Levy in this Scenario">
			<p>Its figures are before tax, because the Scenario has no Levy. Add Thailand's with:</p>
			<pre class="mt-3 overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs text-foreground"><code>{addLevyCommand(name)}</code></pre>
		</EmptyState>
	{:else}
		<TaxHeadline headline={body.headline} currency={run.currency} />
		<TaxTable rows={body.rows} currency={run.currency} />
		{#if body.chart}
			<TaxChart series={body.chart} />
		{/if}
	{/if}
	{#if carry.length > 0}
		<CarryInTable rows={carry} currency={run.currency} />
	{/if}
	{#if run.notes.length > 0}
		<ul class="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
			{#each run.notes as note, index (index)}
				<li>{note}</li>
			{/each}
		</ul>
	{/if}
</div>
