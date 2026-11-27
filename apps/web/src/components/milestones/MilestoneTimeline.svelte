<script lang="ts">
import { formatDate } from "../../lib/format"
import type { ReachedMilestone } from "../../lib/view/milestones/milestones"
import EmptyState from "../ui/EmptyState.svelte"
import ItemName from "../ui/ItemName.svelte"

interface Props {
	/** The Milestones the plan reached, in date order. */
	reached: readonly ReachedMilestone[]
}

let { reached }: Props = $props()
</script>

<section aria-labelledby="milestones-reached" class="space-y-3">
	<h2 id="milestones-reached" class="text-base font-semibold">Reached</h2>
	{#if reached.length === 0}
		<EmptyState title="No milestone reached" />
	{:else}
		<ol class="ml-2 space-y-5 border-l border-border pl-6">
			{#each reached as milestone (milestone.id)}
				<li id={milestone.id} class="relative">
					<span
						aria-hidden="true"
						class="absolute top-1.5 -left-[31px] size-3 rounded-full border-2 border-accent bg-background"
					></span>
					<p class="text-sm text-muted-foreground">
						<time datetime={milestone.date}>{formatDate(milestone.date)}</time>
					</p>
					<p class="font-medium"><ItemName kind="milestone" id={milestone.id} /></p>
				</li>
			{/each}
		</ol>
	{/if}
</section>
