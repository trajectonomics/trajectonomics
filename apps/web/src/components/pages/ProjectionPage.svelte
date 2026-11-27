<script lang="ts">
import { whatIfSession } from "../../client/what-if.svelte.js"
import { chooseScenario } from "../../lib/view/plan"
import { baselineRun } from "../../lib/view/what-if/baseline"
import { ALL_YEAR_FIGURES } from "../../lib/view/what-if/years"
import HouseholdSection from "../household/HouseholdSection.svelte"
import ProjectionView from "../projection/ProjectionView.svelte"
import PageShell from "../ui/PageShell.svelte"
import ProjectionWhatIf from "../what-if/ProjectionWhatIf.svelte"

interface Props {
	/** The Scenario the address bar asks for, and the setter that writes it. */
	scenario: string
	/** Whether the Edit controls show: the server answers, and the page is not the Demo snapshot. */
	editable: boolean
	onScenario: (value: string) => unknown
	/** The terms the address bar asks for, and the setter that writes them. */
	terms: string
	onTerms: (value: string) => void
	/** The custom chart the address bar names, and the setter that writes it. */
	chart: string
	onChart: (id: string) => void
}

/** The Projection: one Scenario, year by year, in nominal and real terms, with its notes and tax status. */
let { scenario, editable, onScenario, terms, onTerms, chart, onChart }: Props = $props()
</script>

<PageShell
	title="Projection"
	intro="One plan projected year by year, in future money and today's money, with its notes and tax status."
>
	{#snippet children(snapshot)}
		{@const plan = chooseScenario(snapshot.params.scenarios, scenario)}
		{@const lens = plan === null ? null : whatIfSession.lensFor(plan)}
		{#if lens && plan !== null}
			<ProjectionWhatIf {lens} baseline={baselineRun(snapshot, plan)} {terms} keys={ALL_YEAR_FIGURES} />
		{/if}
		<HouseholdSection {snapshot} {scenario} {editable} />
		<ProjectionView
			names={snapshot.params.scenarios}
			projections={snapshot.reads.projections}
			{scenario}
			{onScenario}
			{terms}
			{onTerms}
			{chart}
			{onChart}
		/>
	{/snippet}
</PageShell>
