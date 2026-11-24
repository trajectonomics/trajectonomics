<script lang="ts">
import { editSession } from "../../client/edit.svelte.js"
import StaleNotice from "../ui/StaleNotice.svelte"

interface Props {
	name: string
	contentHash: string
}

let { name, contentHash }: Props = $props()
let confirming = $state(false)
const button =
	"rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50"

/** Removes the plan's tax, which also clears its stored profile and the tax labels of its Flows. */
async function remove(): Promise<void> {
	editSession.clear()
	if (await editSession.run({ kind: "remove-tax", name, contentHash }, "remove-tax"))
		confirming = false
}
</script>

{#if confirming}
	<div class="space-y-3">
		<p class="text-sm text-foreground">Remove the tax of plan {name}? Its tax rules, the stored profile and the tax labels on its Flows are taken out, and its figures are before tax again.</p>
		{#if editSession.source === "remove-tax"}
			{#if editSession.error}<p role="alert" class="text-sm text-destructive">{editSession.error}</p>{/if}
			<StaleNotice />
		{/if}
		<div class="flex flex-wrap gap-2">
			<button type="button" disabled={editSession.busy} onclick={remove} class={button}>Remove tax</button>
			<button type="button" onclick={() => (confirming = false)} class={button}>Keep tax</button>
		</div>
	</div>
{:else}
	<button type="button" disabled={editSession.busy} onclick={() => (confirming = true)} class={button}>Remove tax</button>
{/if}
