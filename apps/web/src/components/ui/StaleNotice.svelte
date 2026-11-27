<script lang="ts">
import { editSession, STALE_PLAN } from "../../client/edit.svelte.js"

const button =
	"rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50"
let notice: HTMLDivElement | undefined = $state()

// A refusal over a changed plan fills this notice: focus moves to it, so a keyboard reader lands on Reload.
$effect(() => {
	if (editSession.stale) notice?.focus()
})
</script>

<!-- Shown when the CLI refused a save over a plan that changed since the page read it. Reload reads it again. -->
{#if editSession.stale}
	<div bind:this={notice} role="alert" tabindex="-1" class="space-y-3 rounded-md border border-border bg-muted p-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
		<p class="text-sm text-foreground">{STALE_PLAN}</p>
		<button type="button" onclick={() => editSession.reread()} disabled={editSession.busy} class={button}>Reload</button>
	</div>
{/if}
