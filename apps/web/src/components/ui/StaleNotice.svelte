<script lang="ts">
import { editSession, STALE_PLAN } from "../../client/edit.svelte.js"

const button =
	"rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50"
</script>

<!-- Shown when the CLI refused a save over a plan that changed since the page read it. Reload reads it again. -->
{#if editSession.stale}
	<div role="alert" class="space-y-3 rounded-md border border-border bg-muted p-3">
		<p class="text-sm text-foreground">{STALE_PLAN}</p>
		<button type="button" onclick={() => editSession.reread()} disabled={editSession.busy} class={button}>Reload</button>
	</div>
{/if}
