<script lang="ts">
import { editSession } from "../../client/edit.svelte.js"
import { currentItemText } from "../../client/item-names.svelte.js"
import type { ItemKind } from "../../lib/view/item-names"

interface Props {
	/** The item's id when the form edits an item; absent for a new one, which has nothing to delete. */
	id?: string | undefined
	/** What the id names, so the question calls it by its name: an Account by the ledger's, a person by role. A Flow's id is shown as it is. */
	kind?: ItemKind
	/** Removes the item from the plan. Runs after the person confirms the delete; absent for a form that deletes nothing. */
	onDelete?: () => void
	/** True when the drawer tries a value in the What-if session: the save is a Set, and nothing is deleted. */
	trying?: boolean
	/** What the delete removes and keeps, shown with the question when it is more than the item itself. */
	note?: string | undefined
}

let { id, kind = "account", onDelete, trying = false, note }: Props = $props()
// An item is called by the words a Read states for it; an id no Read names (a Flow's) is shown as it is.
const called = $derived(id === undefined ? undefined : currentItemText(kind, id))
let confirming = $state(false)

const button =
	"rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50"
</script>

<!-- Save sends the item's document as one Edit. Delete asks first, because a removed item cannot be undone here. -->
<div class="space-y-3 border-t border-border pt-4">
	<div class="flex flex-wrap gap-2">
		<button type="submit" disabled={editSession.busy} class={button}>{trying ? "Try this value" : "Save"}</button>
		{#if id !== undefined && !confirming && !trying}
			<button type="button" onclick={() => (confirming = true)} disabled={editSession.busy} class={button}>
				Delete
			</button>
		{/if}
	</div>
	{#if id !== undefined && confirming}
		<p class="text-sm text-foreground">Delete {called} from this plan?</p>
		{#if note}<p class="text-sm text-muted-foreground">{note}</p>{/if}
		<div class="flex flex-wrap gap-2">
			<button type="button" onclick={onDelete} disabled={editSession.busy} class={button}>
				Delete {called}
			</button>
			<button type="button" onclick={() => (confirming = false)} class={button}>Keep {called}</button>
		</div>
	{/if}
</div>
