<script lang="ts">
import HouseholdSection from "../household/HouseholdSection.svelte"
import ProjectionView from "../projection/ProjectionView.svelte"
import PageShell from "../ui/PageShell.svelte"

interface Props {
	/** The Scenario the address bar asks for, and the setter that writes it. */
	scenario: string
	/** Whether the Edit controls show: the server answers, and the page is not the Demo snapshot. */
	editable: boolean
	onScenario: (value: string) => void
	/** The terms the address bar asks for, and the setter that writes them. */
	terms: string
	onTerms: (value: string) => void
}

/** The Projection: one Scenario, year by year, in nominal and real terms, with its notes and tax status. */
let { scenario, editable, onScenario, terms, onTerms }: Props = $props()
</script>

<PageShell
	title="Projection"
	intro="One Scenario projected year by year, in nominal and real terms, with its notes and tax status."
>
	{#snippet children(snapshot)}
		<HouseholdSection {snapshot} {scenario} {editable} />
		<ProjectionView
			projections={snapshot.reads.projections}
			{scenario}
			{onScenario}
			{terms}
			{onTerms}
		/>
	{/snippet}
</PageShell>
