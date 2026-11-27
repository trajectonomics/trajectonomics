<script lang="ts">
import MilestonesView from "../milestones/MilestonesView.svelte"
import PageShell from "../ui/PageShell.svelte"

interface Props {
	/** The Scenario the address bar asks for, which the plan switcher sets. */
	scenario: string
	/** The terms the address bar asks for, and the setter that writes them. */
	terms: string
	onTerms: (value: string) => void
}

/** The milestones of the selected plan: when it reaches each target, and which ones it does not. */
let { scenario, terms, onTerms }: Props = $props()
</script>

<PageShell
	title="Milestones"
>
	{#snippet children(snapshot)}
		<MilestonesView
			names={snapshot.params.scenarios}
			projections={snapshot.reads.projections}
			{scenario}
			{terms}
			{onTerms}
		/>
	{/snippet}
</PageShell>
