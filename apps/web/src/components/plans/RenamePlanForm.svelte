<script lang="ts">
import { editSession } from "../../client/edit.svelte.js"
import { selectPlan } from "../../client/select-plan.svelte.js"
import { renameEdit, renameError } from "../../lib/view/plans/edits"
import type { PlanRow } from "../../lib/view/plans/rows"
import PlanForm from "./PlanForm.svelte"
import { FIELD } from "./styles"

interface Props {
	row: PlanRow
	/** Every name the ledger holds. */
	stored: readonly string[]
	/** Whether the pages show this plan, so the address bar follows its new name. */
	shown: boolean
	onDone: () => void
}

let { row, stored, shown, onDone }: Props = $props()
let draft = $state("")
let problem: string | null = $state(null)
const current = $derived(row.name)
// Starts on the plan's name; a Snapshot read again while typing leaves what was typed (the name is the same).
$effect(() => {
	draft = current
})

async function save(): Promise<void> {
	problem = renameError(row, draft, stored)
	if (problem !== null) return
	if (await editSession.run(renameEdit(row, draft))) {
		if (shown) selectPlan(draft.trim())
		onDone()
	}
}
</script>

<PlanForm submit="Rename" {problem} onSubmit={save} onCancel={onDone}>
	<div class="space-y-1.5">
		<label for="plan-rename" class="block text-sm font-medium text-foreground">New name for {row.name}</label>
		<input id="plan-rename" bind:value={draft} autocomplete="off" class={FIELD} />
		<p class="text-xs text-muted-foreground">The plan keeps its figures, its notes and its history.</p>
	</div>
</PlanForm>
