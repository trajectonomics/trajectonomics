<script lang="ts">
import ProjectionView from "../projection/ProjectionView.svelte"
import PageShell from "../ui/PageShell.svelte"

interface Props {
	/** The Scenario the address bar asks for, and the setter that writes it. */
	scenario: string
	onScenario: (value: string) => void
	/** The terms the address bar asks for, and the setter that writes them. */
	terms: string
	onTerms: (value: string) => void
}

/** The Projection: one Scenario, year by year, in nominal and real terms, with its notes and tax status. */
let { scenario, onScenario, terms, onTerms }: Props = $props()
</script>

<PageShell
	title="Projection"
	intro="One Scenario projected year by year, in nominal and real terms, with its notes and tax status."
>
	{#snippet children(snapshot)}
		<ProjectionView
			projections={snapshot.reads.projections}
			{scenario}
			{onScenario}
			{terms}
			{onTerms}
		/>
	{/snippet}
</PageShell>
