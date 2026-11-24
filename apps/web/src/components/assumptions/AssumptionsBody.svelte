<script lang="ts">
import type { Snapshot } from "../../lib/contract"
import { chooseScenario } from "../../lib/view/projection/scenario"
import EmptyState from "../ui/EmptyState.svelte"
import ReadView from "../ui/ReadView.svelte"
import AssumptionsForm from "./AssumptionsForm.svelte"
import ChanceSettings from "./ChanceSettings.svelte"

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
const chance = $derived(name === null ? undefined : snapshot.reads.chance[name])
</script>

{#if name === null || read === undefined}
	<EmptyState title="No plan to read" />
{:else}
	<div class="space-y-8">
		<ReadView {read} label={`The assumptions of ${name}`}>
			{#snippet children(data)}
				<!-- Made again when the plan's hash changes, so a Reload never carries an old value over a changed one. -->
				{#key data.scenario.contentHash}
					<AssumptionsForm {name} show={data.scenario} {editable} />
				{/key}
			{/snippet}
		</ReadView>
		<ChanceSettings params={snapshot.params} read={chance} {editable} />
	</div>
{/if}
