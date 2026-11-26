<script lang="ts">
import { snapshotPeople } from "../../lib/view/item-names"
import TaxPanel from "../tax/TaxPanel.svelte"
import PageShell from "../ui/PageShell.svelte"

interface Props {
	/** The Scenario the address bar asks for, read by the route file. */
	scenario: string
	/** Sets the Scenario in the address bar. */
	onScenario: (name: string) => unknown
}

let { scenario, onScenario }: Props = $props()
</script>

<!-- Tax: per Levy and tax year, what is owed, what was prepaid, and whether it is settled. -->
<PageShell
	title="Tax"
	intro="Each Levy's settlement period: what is due, prepaid and owed, and whether it is settled."
>
	{#snippet children(snapshot)}
		<TaxPanel
			names={snapshot.params.scenarios}
			projections={snapshot.reads.projections}
			people={snapshotPeople(snapshot, snapshot.params.scenarios)}
			requested={scenario}
			{onScenario}
		/>
	{/snippet}
</PageShell>
