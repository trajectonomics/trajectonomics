<script lang="ts">
import { whatIfSession } from "../../client/what-if.svelte.js"
import type { ProjectionChance, ProjectionRun, Read } from "../../lib/contract"
import { chooseScenario } from "../../lib/view/plan"
import EmptyState from "../ui/EmptyState.svelte"
import ReadView from "../ui/ReadView.svelte"
import MilestonesWhatIf from "../what-if/MilestonesWhatIf.svelte"
import WhatIfAbove from "../what-if/WhatIfAbove.svelte"
import MilestoneFocus from "./MilestoneFocus.svelte"
import MilestonesBody from "./MilestonesBody.svelte"

interface Props {
	/** The Scenarios the Snapshot planned, main first; the plan switcher's choices. */
	names: readonly string[]
	/** The projection Reads of the Snapshot, by Scenario name. */
	projections: Readonly<Record<string, Read<ProjectionRun>>>
	/** The chance Reads of the Snapshot, by Scenario name: one may state an age at the next milestone. */
	chances: Readonly<Record<string, Read<ProjectionChance>>>
	/** The Scenario the plan switcher selects. An unknown one shows the first. */
	scenario: string
	/** The Snapshot's As-of: the timeline starts here. */
	asOf: string
	terms: string
	onTerms: (value: string) => void
}

/** The milestones of the selected plan. The choice lives in the plan switcher, not on this page. */
let { names, projections, chances, scenario, asOf, terms, onTerms }: Props = $props()
const name = $derived(chooseScenario(names, scenario))
const read = $derived(name === null ? undefined : projections[name])
const chance = $derived(name === null ? undefined : chances[name])
</script>

{#if name === null || read === undefined}
	<EmptyState title="No plan to show milestones for" />
{:else}
	{@const lens = whatIfSession.lensFor(name)}
	<ReadView {read} label={`Milestones of ${name}`}>
		{#snippet children(run)}
			<div class="space-y-8">
				<MilestoneFocus {run} {asOf} chance={chance?.ok === true ? chance.data : null} />
				<WhatIfAbove open={lens !== null}>
					{#snippet whatIf()}{#if lens}<MilestonesWhatIf {lens} />{/if}{/snippet}
					<MilestonesBody {run} argv={read.argv} {terms} {onTerms} />
				</WhatIfAbove>
			</div>
		{/snippet}
	</ReadView>
{/if}
