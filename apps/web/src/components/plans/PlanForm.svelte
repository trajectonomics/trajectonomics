<script lang="ts">
import type { Snippet } from "svelte"
import { editSession } from "../../client/edit.svelte.js"
import { isCliError } from "../../lib/edit/failure"
import { BUTTON } from "./styles"

interface Props {
	/** The words of the submit button, such as "Rename". */
	submit: string
	/** The form's own problem, which the Dashboard found before asking traj. */
	problem: string | null
	onSubmit: () => void
	onCancel: () => void
	children: Snippet
}

let { submit, problem, onSubmit, onCancel, children }: Props = $props()
const fromCli = $derived(problem === null && isCliError(editSession.failure))
const shown = $derived(problem ?? editSession.error)
</script>

<!-- A plan form: its fields, the one problem that applies, and Save and Cancel. The Edit runs on the server. -->
<form
	onsubmit={(event) => {
		event.preventDefault()
		onSubmit()
	}}
	class="space-y-4"
>
	{@render children()}
	{#if shown}
		<p role="alert" class="text-sm text-destructive" data-cli={fromCli ? "" : undefined}>{shown}</p>
	{/if}
	<div class="flex flex-wrap gap-2">
		<button type="submit" disabled={editSession.busy} class={BUTTON}>{submit}</button>
		<button type="button" onclick={onCancel} class={BUTTON}>Cancel</button>
	</div>
</form>
