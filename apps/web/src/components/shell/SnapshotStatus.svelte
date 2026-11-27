<script lang="ts">
import { currentSearch } from "../../client/location.svelte.js"
import { currentSnapshot } from "../../client/snapshot.svelte.js"
import { isDemo } from "../../lib/view/snapshot-url"
import Badge from "../ui/Badge.svelte"
import { statusLine } from "./status-line"

const state = $derived(currentSnapshot())
</script>

<!-- The As-of, the currency and the traj version these figures state, and a badge when it is the Demo. -->
<div class="flex flex-wrap items-center gap-x-3 gap-y-2 py-2 text-sm text-muted-foreground">
	{#if state.status === "loading"}
		<span>Loading…</span>
	{:else if state.status !== "ready"}
		<span>No figures are loaded.</span>
	{:else}
		<span>{statusLine(state.snapshot)}</span>
	{/if}
	{#if isDemo(currentSearch())}
		<Badge tone="accent">Demo data</Badge>
	{/if}
</div>
