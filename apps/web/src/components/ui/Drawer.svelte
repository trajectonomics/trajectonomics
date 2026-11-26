<script lang="ts">
import type { Snippet } from "svelte"
import NavIcon from "../shell/NavIcon.svelte"

interface Props {
	/** Whether the drawer is open. An open drawer is a modal dialog, so focus stays inside it. */
	open: boolean
	/** The drawer's heading, which names it to a screen reader. */
	title: string
	/** Runs when the drawer closes by any means: its close button, a click on the backdrop, or Escape. */
	onClose: () => void
	/** True while the drawer must stay open, such as a write that is running: Escape, the close button and the backdrop do nothing. */
	locked?: boolean
	/** Whether a click on the backdrop closes the drawer. A drawer that holds a draft turns it off. */
	backdropCloses?: boolean
	children: Snippet
}

let { open, title, onClose, locked = false, backdropCloses = true, children }: Props = $props()
let dialog: HTMLDialogElement | undefined = $state()
/** Unique to this drawer, so a page with several names each by its own heading. */
const titleId = $props.id()

// showModal traps focus in the dialog, and Escape closes it through the dialog's own close event.
$effect(() => {
	if (!dialog) return
	if (open && !dialog.open) dialog.showModal()
	if (!open && dialog.open) dialog.close()
})
</script>

<!-- A drawer on the right: full width on a phone, a column on a wider screen. -->
<dialog
	bind:this={dialog}
	aria-labelledby="{titleId}-title"
	oncancel={(event) => {
		if (locked) event.preventDefault()
	}}
	onclose={onClose}
	onclick={(event) => {
		if (event.target === dialog && backdropCloses && !locked) onClose()
	}}
	class="m-0 ml-auto h-dvh max-h-none w-full max-w-full border-l border-border bg-card p-0 text-card-foreground backdrop:bg-black/40 sm:w-96"
>
	<div class="flex h-full flex-col gap-5 overflow-y-auto p-5">
		<div class="flex items-center justify-between gap-2">
			<h2 id="{titleId}-title" class="min-w-0 text-base font-semibold wrap-anywhere">{title}</h2>
			<button
				type="button"
				onclick={() => {
					if (!locked) onClose()
				}}
				class="inline-flex rounded-md p-1.5 text-muted-foreground outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
			>
				<NavIcon name="x" />
				<span class="sr-only">Close the drawer</span>
			</button>
		</div>
		{@render children()}
	</div>
</dialog>
