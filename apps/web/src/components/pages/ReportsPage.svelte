<script lang="ts">
import { whatIfSession } from "../../client/what-if.svelte.js"
import { chooseScenario } from "../../lib/view/plan"
import ReportView from "../reports/ReportView.svelte"
import PageShell from "../ui/PageShell.svelte"

interface Props {
	/** The Scenario the address bar asks for, which the plan switcher sets. */
	scenario: string
	/** The terms the address bar asks for; the print header names them. */
	terms: string
}

/** Reports: a table of the selected plan, as traj stated it, downloaded as CSV or JSON, or printed. */
let { scenario, terms }: Props = $props()
</script>

<PageShell
	title="Reports"
	intro="Download a table of the selected plan as CSV or JSON, or print this page. Every figure is one traj stated: nothing is added, rounded or reformatted."
>
	{#snippet children(snapshot)}
		{@const plan = chooseScenario(snapshot.params.scenarios, scenario)}
		{#if plan === null}
			<p role="status" class="text-muted-foreground">The Snapshot holds no plan to report on.</p>
		{:else}
			<ReportView
				{snapshot}
				{plan}
				{terms}
				lens={whatIfSession.lensFor(plan)}
				changes={whatIfSession.changesFor(plan)}
			/>
		{/if}
	{/snippet}
</PageShell>
