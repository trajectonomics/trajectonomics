<script lang="ts">
import { editSession } from "../../client/edit.svelte.js"
import { isCliError } from "../../lib/edit/failure"
import FormAlert from "./FormAlert.svelte"
import StaleNotice from "./StaleNotice.svelte"

interface Props {
	/** The `source` of the inline action this sits beside (`actionSource`). */
	source: string
	/** True when a row of the page already says the error, so it is not said twice. */
	onRow?: boolean
}

let { source, onRow = false }: Props = $props()
const message = $derived(onRow ? null : editSession.error)
const shown = $derived(editSession.source === source && (editSession.stale || message !== null))

// A control that leaves the page forgets its refusal, so no form opened afterwards shows it.
$effect(() => {
	const own = source
	return () => {
		if (editSession.source === own) editSession.clear()
	}
})
</script>

<!-- What an inline action's Edit was refused with, beside the control that sent it: a plan that moved on, with Reload, or the error. -->
{#if shown}
	<div class="basis-full space-y-2">
		<StaleNotice shows="stale" {source} />
		{#if message !== null}<FormAlert {message} fromCli={isCliError(editSession.failure)} />{/if}
	</div>
{/if}
