<script lang="ts">
import { formatDate } from "../../lib/format"
import type { UnreachedMilestone } from "../../lib/view/milestones/milestones"
import ItemName from "../ui/ItemName.svelte"

interface Props {
	/** The Milestones the plan did not reach, in Scenario order. */
	unreached: readonly UnreachedMilestone[]
}

let { unreached }: Props = $props()
</script>

<!-- Listed apart from the timeline, so a missed target is not read as one that is only far off. -->
{#if unreached.length > 0}
	<section aria-labelledby="milestones-unreached" class="space-y-3">
		<h2 id="milestones-unreached" class="text-base font-semibold">Unreached</h2>
		<ul class="space-y-2">
			{#each unreached as milestone (milestone.id)}
				<li class="rounded-lg border border-border bg-card p-4">
					<p class="font-medium"><ItemName kind="milestone" id={milestone.id} /></p>
					<p class="mt-1 text-sm text-muted-foreground">
						Not reached by <time datetime={milestone.notReachedBy}>{formatDate(milestone.notReachedBy)}</time>
					</p>
				</li>
			{/each}
		</ul>
	</section>
{/if}
