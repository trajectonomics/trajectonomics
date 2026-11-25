<script lang="ts">
import type { Snapshot } from "../../lib/contract"
import { chooseScenario } from "../../lib/view/plan"
import type { PlanKind } from "../../lib/view/plan-items/kinds"
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
/** The plan's Projection run, which states the loans' statements (cli ADR 0059), when it is read. */
const projection = $derived(name === null ? undefined : snapshot.reads.projections[name])
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
				contentHash={data.scenario.contentHash}
				baseline={snapshot.reads.baseline}
				run={projection?.ok === true ? projection.data : undefined}
				{editable}
			/>
		{/snippet}
	</ReadView>
{/if}
