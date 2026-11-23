<script lang="ts">
import type { ProjectionAllowances, ScenarioDocument } from "../../lib/contract"
import { allowancesView } from "../../lib/view/allowances"
import EmptyState from "../ui/EmptyState.svelte"
import LaterYears from "./LaterYears.svelte"
import YearCard from "./YearCard.svelte"

interface Props {
	data: ProjectionAllowances
	plan: { name: string; contentHash: string; doc: ScenarioDocument } | null
}

let { data, plan }: Props = $props()
const view = $derived(allowancesView(data))
</script>

<!-- The CLI's reading of one plan: this tax year first, then the later years, the assumptions and the notes. -->
<div class="space-y-8">
	{#if view.current === null && view.later.length === 0}
		<EmptyState title="No whole tax year to read">
			<p>The plan holds no whole tax year after the As-of.</p>
		</EmptyState>
	{/if}
	{#if view.current}<YearCard year={view.current} currency={view.currency} {plan} />{/if}
	{#if view.later.length > 0}<LaterYears years={view.later} currency={view.currency} {plan} />{/if}
	{#if view.assumptions.length > 0}
		<details class="rounded-lg border border-border p-4 text-sm">
			<summary class="cursor-pointer font-medium">Details: the tax figures used</summary>
			<ul class="mt-2 list-disc space-y-1 pl-5">
				{#each view.assumptions as line (line.key)}
					<li><code class="font-mono text-xs">{line.path}</code>: {line.text}</li>
				{/each}
			</ul>
		</details>
	{/if}
	<ul class="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
		{#each view.notes as note, index (index)}<li>{note}</li>{/each}
	</ul>
</div>
