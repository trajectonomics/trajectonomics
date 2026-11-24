<script lang="ts">
import type { Snapshot } from "../../lib/contract"
import { chooseScenario } from "../../lib/view/projection/scenario"
import EmptyState from "../ui/EmptyState.svelte"
import ReadView from "../ui/ReadView.svelte"
import TaxPerYear from "./TaxPerYear.svelte"
import TaxProfileCard from "./TaxProfileCard.svelte"

interface Props {
	snapshot: Snapshot
	/** The Scenario the address bar asks for. An unknown one shows the first plan. */
	scenario: string
	/** Whether the controls show: the server answers, and the page is not the Demo snapshot. */
	editable: boolean
}

let { snapshot, scenario, editable }: Props = $props()
const name = $derived(chooseScenario(snapshot.params.scenarios, scenario))
const read = $derived(name === null ? undefined : snapshot.reads.documents[name])
const run = $derived(name === null ? undefined : snapshot.reads.projections[name])
</script>

{#if name === null || read === undefined}
	<EmptyState title="No plan to read" />
{:else}
	<div class="space-y-10">
		<ReadView {read} label={`The tax profile of ${name}`}>
			{#snippet children(data)}
				<TaxProfileCard {name} show={data.scenario} {editable} />
			{/snippet}
		</ReadView>
		{#if run !== undefined}<TaxPerYear {name} read={run} />{/if}
	</div>
{/if}
