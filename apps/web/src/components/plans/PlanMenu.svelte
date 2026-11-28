<script lang="ts">
import { editSession } from "../../client/edit.svelte.js"
import { planEditor } from "../../client/plan-editor.svelte.js"
import { actionSource } from "../../lib/view/action-source"
import { ACTION_LABELS, mainEdit, type PlanAction, planActions } from "../../lib/view/plans/edits"
import type { PlanRow } from "../../lib/view/plans/rows"
import ActionRefusal from "../ui/ActionRefusal.svelte"
import { BUTTON } from "./styles"

interface Props {
	row: PlanRow
}

let { row }: Props = $props()
let menu: HTMLDetailsElement | undefined = $state()
/** "Make this my main plan" saves from the menu itself, so its refusal shows beside the menu. */
const source = $derived(actionSource("main", row.name))

async function choose(action: PlanAction): Promise<void> {
	if (menu) menu.open = false
	if (action === "main") await editSession.run(mainEdit(row.name), source)
	else planEditor.open(action, row.name)
}
</script>

<!-- A plan's menu: rename it, keep notes, make it the main plan, copy it, delete it. Each action is one Edit. -->
<details bind:this={menu} class="relative">
	<summary
		aria-label={`Actions for ${row.name}`}
		class="cursor-pointer list-none rounded-md border border-border bg-card px-2.5 py-1 text-sm text-foreground outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
	>
		Actions
	</summary>
	<ul class="mt-1 flex flex-col gap-1 rounded-md border border-border bg-card p-1">
		{#each planActions(row) as action (action)}
			<li>
				<button
					type="button"
					onclick={() => choose(action)}
					disabled={editSession.busy}
					class={`${BUTTON} w-full text-left`}
				>
					{ACTION_LABELS[action]}
				</button>
			</li>
		{/each}
	</ul>
</details>
<ActionRefusal {source} />
