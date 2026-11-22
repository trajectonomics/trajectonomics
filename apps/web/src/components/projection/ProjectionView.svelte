<script lang="ts">
import type { ProjectionRun, Read } from "../../lib/contract"
import { chooseScenario, projectionNames } from "../../lib/view/projection/scenario"
import EmptyState from "../ui/EmptyState.svelte"
import ReadView from "../ui/ReadView.svelte"
import SegmentedControl from "../ui/SegmentedControl.svelte"
import ProjectionResult from "./ProjectionResult.svelte"

interface Props {
	/** The projection Reads of the Snapshot, by Scenario name. */
	projections: Readonly<Record<string, Read<ProjectionRun>>>
	/** The Scenario the address bar asks for. An unknown one shows the first. */
	scenario: string
	onScenario: (value: string) => void
	terms: string
	onTerms: (value: string) => void
}

/** The Scenario picker and the projection of the chosen Scenario. The choice lives in the address bar. */
let { projections, scenario, onScenario, terms, onTerms }: Props = $props()
const names = $derived(projectionNames(projections))
const name = $derived(chooseScenario(names, scenario))
const read = $derived(name === null ? undefined : projections[name])
const options = $derived(names.map((value) => ({ value, label: value })))
</script>

{#if name === null || read === undefined}
	<EmptyState title="No Scenario to project" />
{:else}
	<div class="space-y-6">
		<SegmentedControl
			name="scenario"
			label="Scenario"
			{options}
			value={name}
			onChange={onScenario}
		/>
		<ReadView {read} label={`Projection of ${name}`}>
			{#snippet children(run)}
				<ProjectionResult {run} argv={read.argv} {terms} {onTerms} />
			{/snippet}
		</ReadView>
	</div>
{/if}
