<script lang="ts">
import ChanceView from "../chance/ChanceView.svelte"
import PageShell from "../ui/PageShell.svelte"

interface Props {
	/** The Scenario the address bar asks for, and the setter that writes it. */
	scenario: string
	onScenario: (value: string) => unknown
}

/** The chance of success: the share of seeded Market paths a Scenario holds to its Horizon. */
let { scenario, onScenario }: Props = $props()
</script>

<PageShell
	title="Chance of success"
>
	{#snippet children(snapshot)}
		<ChanceView
			names={snapshot.params.scenarios}
			chance={snapshot.reads.chance}
			{scenario}
			{onScenario}
		/>
	{/snippet}
</PageShell>
