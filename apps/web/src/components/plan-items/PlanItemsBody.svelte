<script lang="ts">
import type { Snapshot } from "../../lib/contract"
import type { PlanKind } from "../../lib/view/plan-items/kinds"
import { chooseScenario } from "../../lib/view/projection/scenario"
import EmptyState from "../ui/EmptyState.svelte"
import ReadView from "../ui/ReadView.svelte"
import PlanItemsList from "./PlanItemsList.svelte"

interface Props {
	snapshot: Snapshot
	kind: PlanKind
	/** The Scenario the address bar asks for. An unknown one shows the first plan. */
	scenario: string
	editable: boolean
}

let { snapshot, kind, scenario, editable }: Props = $props()
const name = $derived(chooseScenario(snapshot.params.scenarios, scenario))
const read = $derived(name === null ? undefined : snapshot.reads.documents[name])
</script>

{#if name === null || read === undefined}
	<EmptyState title="No plan document in this Snapshot">
		<p>The Snapshot holds no document for the selected plan, so its items cannot be shown.</p>
	</EmptyState>
{:else}
	<ReadView {read} label={`The plan ${name}`}>
		{#snippet children(data)}
			<PlanItemsList
				{kind}
				{name}
				doc={data.scenario.document}
				household={data.scenario.household}
				baseline={snapshot.reads.baseline}
				{editable}
			/>
		{/snippet}
	</ReadView>
{/if}
