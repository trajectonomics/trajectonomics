<script lang="ts">
import { currentSnapshot } from "../../client/snapshot.svelte.js"

const state = $derived(currentSnapshot())
</script>

<!-- The top bar's warning while the figures are not ready; a ready one says nothing. -->
{#if state.status !== "ready"}
	<div class="mx-auto w-full max-w-6xl px-4 pb-2 text-sm text-muted-foreground sm:px-6">
		<span>{state.status === "loading" ? "Loading…" : "No figures are loaded."}</span>
	</div>
{/if}
