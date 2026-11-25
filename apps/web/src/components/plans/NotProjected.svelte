<script lang="ts">
import { editSession } from "../../client/edit.svelte.js"
import type { PlanRow } from "../../lib/view/plans/rows"
import PlanTags from "./PlanTags.svelte"
import { BUTTON } from "./styles"

interface Props {
	rows: readonly PlanRow[]
	editable: boolean
}

let { rows, editable }: Props = $props()
</script>

<!-- Plans the ledger holds that this dashboard was not started with: listed by name, with an action to add each. -->
{#if rows.length > 0}
	<section aria-labelledby="not-projected" class="space-y-3">
		<h2 id="not-projected" class="text-base font-semibold">Other plans in your ledger</h2>
		<ul class="space-y-2">
			{#each rows as row (row.name)}
				<li class="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-3">
					<span class="min-w-0 text-sm font-medium break-words">{row.name}</span>
					<PlanTags {row} />
					<span class="text-sm text-muted-foreground">Not projected in this dashboard</span>
					{#if editable}
						<button
							type="button"
							onclick={() => editSession.addPlan(row.name)}
							disabled={editSession.busy}
							class={BUTTON}
						>
							Add {row.name} to this dashboard
						</button>
					{/if}
				</li>
			{/each}
		</ul>
	</section>
{/if}
