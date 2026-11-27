<script lang="ts">
interface Props {
	/** The message for the whole form: its own problem, or the CLI's refusal when the refusal names no field of it. */
	message: string
}

let { message }: Props = $props()
let alert: HTMLParagraphElement | undefined = $state()

// A refusal fills this alert: focus moves to it, so a keyboard reader lands on the words instead of the next field.
$effect(() => {
	if (message !== "") alert?.focus()
})
</script>

<p bind:this={alert} role="alert" tabindex="-1" class="text-sm text-destructive focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">{message}</p>
