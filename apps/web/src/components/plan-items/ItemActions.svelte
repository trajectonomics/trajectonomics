<script lang="ts">
import { editSession } from "../../client/edit.svelte.js"

interface Props {
	/** The item's id when the form edits an item; absent for a new one, which has nothing to delete. */
	id?: string | undefined
	/** Removes the item from the plan. Runs after the person confirms the delete. */
	onDelete: () => void
}

let { id, onDelete }: Props = $props()
let confirming = $state(false)

const button =
	"rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50"
</script>

<!-- Save sends the item's document as one Edit. Delete asks first, because a removed item cannot be undone here. -->
<div class="space-y-3 border-t border-border pt-4">
	<div class="flex flex-wrap gap-2">
		<button type="submit" disabled={editSession.busy} class={button}>Save</button>
		{#if id !== undefined && !confirming}
			<button type="button" onclick={() => (confirming = true)} disabled={editSession.busy} class={button}>
				Delete
			</button>
		{/if}
	</div>
	{#if id !== undefined && confirming}
		<p class="text-sm text-foreground">Delete {id} from this plan?</p>
		<div class="flex flex-wrap gap-2">
			<button type="button" onclick={onDelete} disabled={editSession.busy} class={button}>
				Delete {id}
			</button>
			<button type="button" onclick={() => (confirming = false)} class={button}>Keep {id}</button>
		</div>
	{/if}
</div>
