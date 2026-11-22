<script lang="ts">
import type { Snapshot } from "../../lib/contract"
import { chooseScenario } from "../../lib/view/projection/scenario"
import ReadView from "../ui/ReadView.svelte"
import HouseholdCard from "./HouseholdCard.svelte"

interface Props {
	snapshot: Snapshot
	/** The Scenario the address bar asks for. An unknown one shows the first plan. */
	scenario: string
	/** Whether the household controls show: the server answers, and the page is not the Demo snapshot. */
	editable: boolean
}

let { snapshot, scenario, editable }: Props = $props()
const name = $derived(chooseScenario(snapshot.params.scenarios, scenario))
const read = $derived(name === null ? undefined : snapshot.reads.documents[name])
</script>

{#if name !== null && read !== undefined}
	<ReadView {read} label={`The household of ${name}`}>
		{#snippet children(data)}
			<HouseholdCard {name} doc={data.scenario.document} household={data.scenario.household} {editable} />
		{/snippet}
	</ReadView>
{/if}
