<script lang="ts">
import { whatIfSession } from "../../client/what-if.svelte.js"
import type { ProjectionRun, Read } from "../../lib/contract"
import { chooseScenario } from "../../lib/view/plan"
import EmptyState from "../ui/EmptyState.svelte"
import ReadView from "../ui/ReadView.svelte"
import MilestonesWhatIf from "../what-if/MilestonesWhatIf.svelte"
import WhatIfAbove from "../what-if/WhatIfAbove.svelte"
import MilestonesBody from "./MilestonesBody.svelte"

interface Props {
	/** The Scenarios the Snapshot planned, main first; the plan switcher's choices. */
	names: readonly string[]
	/** The projection Reads of the Snapshot, by Scenario name. */
	projections: Readonly<Record<string, Read<ProjectionRun>>>
	/** The Scenario the plan switcher selects. An unknown one shows the first. */
	scenario: string
	terms: string
	onTerms: (value: string) => void
}

/** The milestones of the selected plan. The choice lives in the plan switcher, not on this page. */
let { names, projections, scenario, terms, onTerms }: Props = $props()
const name = $derived(chooseScenario(names, scenario))
const read = $derived(name === null ? undefined : projections[name])
</script>

{#if name === null || read === undefined}
	<EmptyState title="No plan to show milestones for" />
{:else}
	{@const lens = whatIfSession.lensFor(name)}
	<WhatIfAbove open={lens !== null}>
		{#snippet whatIf()}{#if lens}<MilestonesWhatIf {lens} />{/if}{/snippet}
		<ReadView {read} label={`Milestones of ${name}`}>
			{#snippet children(run)}
				<MilestonesBody {run} argv={read.argv} {terms} {onTerms} />
			{/snippet}
		</ReadView>
	</WhatIfAbove>
{/if}
