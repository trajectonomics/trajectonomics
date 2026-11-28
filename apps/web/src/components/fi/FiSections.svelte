<script lang="ts">
import { whatIfSession } from "../../client/what-if.svelte.js"
import type { ProjectionRun, Snapshot } from "../../lib/contract"
import { householdOf, personNames } from "../../lib/view/item-names"
import { focusOf } from "../../lib/view/overview/focus"
import EmptyState from "../ui/EmptyState.svelte"
import ReadView from "../ui/ReadView.svelte"
import FiWhatIf from "../what-if/FiWhatIf.svelte"
import FiFocus from "./FiFocus.svelte"
import FiResult from "./FiResult.svelte"

interface Props {
	/** The Snapshot: its FI Reads, one per Scenario, and the projection and household the first plan's picture draws. */
	snapshot: Snapshot
}

/** One section per plan, each with its own FI answer; the first opens on the plan's chart. */
let { snapshot }: Props = $props()
const uid = $props.id()
const entries = $derived(Object.entries(snapshot.reads.fi))

/** The plan's projection, which the chart draws, or null when the Snapshot has not read one. */
function projectionOf(name: string): ProjectionRun | null {
	const read = snapshot.reads.projections[name]
	return read?.ok === true ? read.data : null
}
</script>

{#if entries.length === 0}
	<EmptyState title="No plan to read" />
{:else}
	<div class="space-y-12">
		{#each entries as [name, read], index (name)}
			{@const lens = whatIfSession.lensFor(name)}
			{@const focus = index === 0 && read.ok ? focusOf(snapshot, name) : null}
			{@const lead = focus !== null && focus.plan === name}
			<section aria-labelledby="{uid}-scenario-{index}" class="space-y-6">
				<h2 id="{uid}-scenario-{index}" class="text-xl font-semibold tracking-tight">{name}</h2>
				{#if lead && focus !== null}
					<FiFocus
						{focus}
						run={projectionOf(name)}
						people={personNames(householdOf(snapshot, name))}
					/>
				{/if}
				{#if lens}<FiWhatIf {lens} />{/if}
				<ReadView {read} label={`FI date of ${name}`}>
					{#snippet children(answer)}
						<FiResult fi={answer} argv={read.argv} {lead} />
					{/snippet}
				</ReadView>
			</section>
		{/each}
	</div>
{/if}
