<script lang="ts">
import { editSession } from "../../client/edit.svelte.js"

interface Props {
	/** The Scenario whose household is removed. */
	name: string
	/** The hash of the document and household the page read (cli ADR 0055). */
	householdHash: string
}

let { name, householdHash }: Props = $props()
let removing = $state(false)
const button =
	"rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50"

/** Removes the household; the dates it pinned stay as they are. */
async function removeHousehold(): Promise<void> {
	if (await editSession.run({ kind: "remove-household", name, householdHash }, "household"))
		removing = false
}
</script>

{#if removing}
	<p class="text-sm text-foreground">Remove the household of {name}? The dates it pinned stay as they are.</p>
	<div class="flex flex-wrap gap-2">
		<button type="button" disabled={editSession.busy} onclick={removeHousehold} class={button}>Remove household</button>
		<button type="button" onclick={() => (removing = false)} class={button}>Keep household</button>
	</div>
{:else}
	<button type="button" disabled={editSession.busy} onclick={() => (removing = true)} class={button}>Remove household</button>
{/if}
