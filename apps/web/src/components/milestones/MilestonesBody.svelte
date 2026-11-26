<script lang="ts">
import type { ProjectionRun } from "../../lib/contract"
import { milestoneView } from "../../lib/view/milestones/milestones"
import NetWorthChart from "../projection/NetWorthChart.svelte"
import EmptyState from "../ui/EmptyState.svelte"
import Provenance from "../ui/Provenance.svelte"
import MilestoneTimeline from "./MilestoneTimeline.svelte"
import UnreachedList from "./UnreachedList.svelte"

interface Props {
	run: ProjectionRun
	/** The argv of the Read the projection came from, for its command. */
	argv: readonly string[]
	terms: string
	onTerms: (value: string) => void
}

/** One plan's milestones: the net-worth chart with a mark for each reached one, the timeline, and the unreached list. */
let { run, argv, terms, onTerms }: Props = $props()
const view = $derived(milestoneView(run))
</script>

<div class="space-y-8">
	{#if view === null}
		<EmptyState title="This plan declares no milestones">
			<p>A plan says when it reaches a target by declaring milestones in the plan itself.</p>
		</EmptyState>
	{:else}
		<NetWorthChart {run} {terms} {onTerms} listedElsewhere />
		<MilestoneTimeline reached={view.reached} />
		<UnreachedList unreached={view.unreached} />
	{/if}
	<Provenance name="Milestones" commands={[argv]} />
</div>
