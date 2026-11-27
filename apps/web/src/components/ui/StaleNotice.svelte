<script lang="ts">
import { editSession, STALE_PLAN } from "../../client/edit.svelte.js"
import { WRITTEN_REREAD_FAILED_MESSAGE } from "../../lib/edit/failure"

const button =
	"rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50"
const shown = $derived(editSession.stale || editSession.savedUnread)
</script>

<!-- Shown when a save could not be answered with a fresh Snapshot: the CLI refused it over a plan that changed,
or the write landed and the Snapshot read that answers it failed. Reload reads the Snapshot again. -->
{#if shown}
	<div role="alert" class="space-y-3 rounded-md border border-border bg-muted p-3">
		<p class="text-sm text-foreground">{editSession.stale ? STALE_PLAN : WRITTEN_REREAD_FAILED_MESSAGE}</p>
		<button type="button" onclick={() => editSession.reread()} disabled={editSession.busy} class={button}>Reload</button>
	</div>
{/if}
