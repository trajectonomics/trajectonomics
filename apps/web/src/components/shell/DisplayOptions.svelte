<script lang="ts">
import { shellPanels } from "../../client/shell.svelte.js"
import { currentSnapshot } from "../../client/snapshot.svelte.js"
import NavIcon from "./NavIcon.svelte"
import PreferenceControls from "./PreferenceControls.svelte"

const snapshotState = $derived(currentSnapshot())
let dialog: HTMLDialogElement | undefined = $state()

function close(): void {
	shellPanels.closeOptions()
}

// The drawer is a modal dialog: showModal traps focus, and Escape closes it through the dialog's own event.
$effect(() => {
	if (!dialog) return
	if (shellPanels.options && !dialog.open) dialog.showModal()
	if (!shellPanels.options && dialog.open) dialog.close()
})
</script>

<!-- A drawer on the right. A click on the backdrop, the close button or Escape shuts it. -->
<dialog
	bind:this={dialog}
	aria-labelledby="display-options-title"
	onclose={close}
	onclick={(event) => {
		if (event.target === dialog) close()
	}}
	class="print:hidden m-0 ml-auto h-dvh max-h-none w-80 max-w-[90vw] border-l border-border bg-card p-0 text-card-foreground backdrop:bg-black/40"
>
	<div class="flex h-full flex-col gap-6 p-5">
		<div class="flex items-center justify-between gap-2">
			<h2 id="display-options-title" class="text-base font-semibold">Display options</h2>
			<button
				type="button"
				onclick={close}
				class="inline-flex rounded-md p-1.5 text-muted-foreground outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
			>
				<NavIcon name="x" />
				<span class="sr-only">Close Display options</span>
			</button>
		</div>
		<PreferenceControls />
		{#if snapshotState.status === "ready"}
			<p class="mt-auto text-xs text-muted-foreground">Read by traj {snapshotState.snapshot.cliVersion}</p>
		{/if}
	</div>
</dialog>
