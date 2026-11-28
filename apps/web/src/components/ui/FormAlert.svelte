<script lang="ts">
interface Props {
	/** The message for the whole form: its own problem, or the CLI's refusal when the refusal names no field of it. */
	message: string
	/** True when the words are the CLI's own. */
	fromCli?: boolean
}

let { message, fromCli = false }: Props = $props()
let alert: HTMLParagraphElement | undefined = $state()
/** The text the alert last took focus for; plain, so comparing it never schedules an effect of its own. */
let focused = ""

// A new refusal fills this alert: focus moves to it, so a keyboard reader lands on the words instead of the next
// field. The same text shown again leaves focus where the person put it.
$effect(() => {
	if (message === "") {
		focused = ""
		return
	}
	if (message === focused) return
	focused = message
	alert?.focus()
})
</script>

<p bind:this={alert} role="alert" tabindex="-1" data-cli={fromCli ? "" : undefined} class="text-sm text-destructive focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">{message}</p>
