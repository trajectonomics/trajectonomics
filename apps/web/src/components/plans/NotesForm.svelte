<script lang="ts">
import { editSession } from "../../client/edit.svelte.js"
import { notesEdit, typedNotesError } from "../../lib/view/plans/edits"
import PlanForm from "./PlanForm.svelte"
import { FIELD } from "./styles"

interface Props {
	name: string
	/** The notes the plan has now, or null. */
	notes: string | null
	onDone: () => void
}

let { name, notes, onDone }: Props = $props()
let draft = $state("")
let problem: string | null = $state(null)
$effect(() => {
	draft = notes ?? ""
})

async function save(): Promise<void> {
	problem = typedNotesError(draft)
	if (problem !== null) return
	if (await editSession.run(notesEdit(name, draft))) onDone()
}
</script>

<PlanForm submit="Save notes" {problem} onSubmit={save} onCancel={onDone}>
	<div class="space-y-1.5">
		<label for="plan-notes" class="block text-sm font-medium text-foreground">What {name} assumes</label>
		<textarea id="plan-notes" bind:value={draft} rows="8" class={FIELD}></textarea>
		<p class="text-xs text-muted-foreground">Plain text. Leave it empty to remove the notes.</p>
	</div>
</PlanForm>
