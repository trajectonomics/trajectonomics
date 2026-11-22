<script lang="ts">
import type { ProjectionRun, Read } from "../../lib/contract"
import { chooseScenario, projectionNames } from "../../lib/view/projection/scenario"
import EmptyState from "../ui/EmptyState.svelte"
import ReadView from "../ui/ReadView.svelte"
import MilestonesBody from "./MilestonesBody.svelte"

interface Props {
	/** The projection Reads of the Snapshot, by Scenario name. */
	projections: Readonly<Record<string, Read<ProjectionRun>>>
	/** The Scenario the plan switcher selects. An unknown one shows the first. */
	scenario: string
	terms: string
	onTerms: (value: string) => void
}

/** The milestones of the selected plan. The choice lives in the plan switcher, not on this page. */
let { projections, scenario, terms, onTerms }: Props = $props()
const names = $derived(projectionNames(projections))
const name = $derived(chooseScenario(names, scenario))
const read = $derived(name === null ? undefined : projections[name])
</script>

{#if name === null || read === undefined}
	<EmptyState title="No Scenario to show milestones for" />
{:else}
	<ReadView {read} label={`Milestones of ${name}`}>
		{#snippet children(run)}
			<MilestonesBody {run} argv={read.argv} {terms} {onTerms} />
		{/snippet}
	</ReadView>
{/if}
