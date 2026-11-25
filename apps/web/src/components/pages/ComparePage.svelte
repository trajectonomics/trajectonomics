<script lang="ts">
import { whatIfSession } from "../../client/what-if.svelte.js"
import { parseTerms, type Terms } from "../../lib/view/compare"
import { baselineRun } from "../../lib/view/what-if/baseline"
import { ALL_YEAR_FIGURES } from "../../lib/view/what-if/years"
import ComparePanel from "../compare/ComparePanel.svelte"
import PageShell from "../ui/PageShell.svelte"
import ProjectionWhatIf from "../what-if/ProjectionWhatIf.svelte"
import WhatIfAbove from "../what-if/WhatIfAbove.svelte"

interface Props {
	/** The terms the address bar asks for, and the setter that writes them. */
	terms: string
	onTerms: (terms: Terms) => void
}

/** Compare: two Scenarios side by side, and the deltas the CLI states between them. */
let { terms, onTerms }: Props = $props()
const chosen = $derived(parseTerms(terms))
</script>

<PageShell
	title="Compare"
	intro="A is drawn solid and B dashed everywhere on this page. Each difference is B minus A, as the CLI states it."
>
	{#snippet children(snapshot)}
		{@const read = snapshot.reads.compare}
		{@const sides = read?.ok ? [read.data.sides.a.scenario.name, read.data.sides.b.scenario.name] : []}
		{@const plan = sides.find((name) => whatIfSession.lensFor(name) !== null)}
		{@const lens = plan === undefined ? null : whatIfSession.lensFor(plan)}
		<WhatIfAbove open={lens !== null}>
			{#snippet whatIf()}
				{#if lens && plan !== undefined}
					<ProjectionWhatIf {lens} baseline={baselineRun(snapshot, plan)} terms={chosen} keys={ALL_YEAR_FIGURES} />
				{/if}
			{/snippet}
			<ComparePanel
				compare={snapshot.reads.compare}
				projections={snapshot.reads.projections}
				terms={chosen}
				{onTerms}
			/>
		</WhatIfAbove>
	{/snippet}
</PageShell>
