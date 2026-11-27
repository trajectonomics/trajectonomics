<script lang="ts">
import { whatIfSession } from "../../client/what-if.svelte.js"
import { householdOf } from "../../lib/view/item-names"
import { chooseScenario } from "../../lib/view/plan"
import { baselineRun } from "../../lib/view/what-if/baseline"
import { ALL_YEAR_FIGURES } from "../../lib/view/what-if/years"
import ProjectionView from "../projection/ProjectionView.svelte"
import PageShell from "../ui/PageShell.svelte"
import ProjectionWhatIf from "../what-if/ProjectionWhatIf.svelte"

interface Props {
	/** The Scenario the address bar asks for. */
	scenario: string
	/** Whether the Edit controls show: the server answers, and the page is not the Demo snapshot. */
	editable: boolean
	/** The terms the address bar asks for, and the setter that writes them. */
	terms: string
	onTerms: (value: string) => void
	/** The custom chart the address bar names, and the setter that writes it. */
	chart: string
	onChart: (id: string) => void
}

/** The Plan: its people, the three figures, and its chart. The household and the years have their own pages. */
let { scenario, editable, terms, onTerms, chart, onChart }: Props = $props()
</script>

<PageShell
	title="Plan"
>
	{#snippet children(snapshot)}
		{@const plan = chooseScenario(snapshot.params.scenarios, scenario)}
		{@const lens = plan === null ? null : whatIfSession.lensFor(plan)}
		{#if lens && plan !== null}
			<ProjectionWhatIf {lens} baseline={baselineRun(snapshot, plan)} {terms} keys={ALL_YEAR_FIGURES} />
		{/if}
		<ProjectionView
			names={snapshot.params.scenarios}
			projections={snapshot.reads.projections}
			{scenario}
			household={householdOf(snapshot, plan)}
			fi={plan === null ? undefined : snapshot.reads.fi[plan]}
			chance={plan === null ? undefined : snapshot.reads.chance[plan]}
			{editable}
			{terms}
			{onTerms}
			{chart}
			{onChart}
		/>
	{/snippet}
</PageShell>
