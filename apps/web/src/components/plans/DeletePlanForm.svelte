<script lang="ts">
import { editSession } from "../../client/edit.svelte.js"
import { selectPlan } from "../../client/select-plan.svelte.js"
import type { PlanRow } from "../../lib/view/plans/rows"
import PlanForm from "./PlanForm.svelte"

interface Props {
	row: PlanRow
	/** The names the pages can show, so a delete of the shown plan shows another. */
	names: readonly string[]
	shown: boolean
	onDone: () => void
}

let { row, names, shown, onDone }: Props = $props()

async function remove(): Promise<void> {
	const left = names.filter((name) => name !== row.name)
	if (await editSession.run({ kind: "delete-plan", name: row.name })) {
		if (shown) selectPlan(left[0] ?? "")
		onDone()
	}
}
</script>

{#if row.main}
	<!-- traj refuses to remove the main plan, so the page says what to do first and offers no delete. -->
	<div class="space-y-4">
		<p class="text-sm text-foreground">
			{row.name} is your main plan. Make another plan the main one first, then delete this one.
		</p>
		<button type="button" onclick={onDone} class="rounded-md border border-border bg-card px-3 py-1.5 text-sm">
			Close
		</button>
	</div>
{:else}
	<PlanForm submit="Delete plan" problem={null} onSubmit={remove} onCancel={onDone}>
		<p class="text-sm text-foreground">Delete the plan {row.name}? Its name is freed for reuse.</p>
	</PlanForm>
{/if}
