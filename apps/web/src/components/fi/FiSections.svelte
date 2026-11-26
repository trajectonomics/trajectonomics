<script lang="ts">
import { whatIfSession } from "../../client/what-if.svelte.js"
import type { Fi, Read } from "../../lib/contract"
import EmptyState from "../ui/EmptyState.svelte"
import ReadView from "../ui/ReadView.svelte"
import FiWhatIf from "../what-if/FiWhatIf.svelte"
import FiResult from "./FiResult.svelte"

interface Props {
	/** The FI Reads of the Snapshot, by Scenario name. */
	fi: Readonly<Record<string, Read<Fi>>>
}

/** One section per plan, each with its own FI answer. */
let { fi }: Props = $props()
const uid = $props.id()
const entries = $derived(Object.entries(fi))
</script>

{#if entries.length === 0}
	<EmptyState title="No plan to read" />
{:else}
	<div class="space-y-12">
		{#each entries as [name, read], index (name)}
			{@const lens = whatIfSession.lensFor(name)}
			<section aria-labelledby="{uid}-scenario-{index}" class="space-y-6">
				<h2 id="{uid}-scenario-{index}" class="text-xl font-semibold tracking-tight">{name}</h2>
				{#if lens}<FiWhatIf {lens} />{/if}
				<ReadView {read} label={`FI date of ${name}`}>
					{#snippet children(answer)}
						<FiResult fi={answer} argv={read.argv} />
					{/snippet}
				</ReadView>
			</section>
		{/each}
	</div>
{/if}
