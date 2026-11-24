<script lang="ts">
import { editSession } from "../../client/edit.svelte.js"
import { labelCommand } from "../../lib/view/tax-settings/labels"
import StaleNotice from "../ui/StaleNotice.svelte"

interface Props {
	name: string
	contentHash: string
	/** Every income Flow of the plan: taking the tax out clears their tax labels. */
	income: readonly string[]
}

let { name, contentHash, income }: Props = $props()
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
		{#if income.length > 0}
			<p class="text-sm text-foreground">Putting tax back then needs a tax label on each income Flow ({income.join(", ")}). This page does not set labels; in a terminal, run <code>{labelCommand(name, false)}</code>.</p>
		{/if}
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
