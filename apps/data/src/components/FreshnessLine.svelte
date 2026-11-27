<script lang="ts">
// biome-ignore-all lint/correctness/noUnusedImports: Biome does not read a Svelte template, so it cannot see the imports it renders.
// biome-ignore-all lint/correctness/noUnusedVariables: Biome does not read a Svelte template, so it cannot see these.
import { collectingLabel } from "../lib/collecting"
import { freshness } from "../lib/freshness"
import type { Health } from "../lib/types"

let {
	health,
	day,
	requestedAsOf = null,
	methodVersion = null,
	liveHref,
}: {
	health: Health | null
	day: string | null
	requestedAsOf?: string | null
	methodVersion?: number | null
	liveHref: string
} = $props()

const fresh = $derived(health === null ? null : freshness(health))
const collecting = $derived(
	health === null || day === null ? null : collectingLabel(health.collectingSince, day),
)
</script>

{#if fresh !== null}
	<p class="freshness-line" title={fresh.at ?? undefined}>
		<span class="freshness-dot" class:freshness-stale={fresh.note !== null} aria-hidden="true"
		></span>
		<span>{fresh.label}</span>
		{#if fresh.at !== null}<span class="visually-hidden">({fresh.at})</span>{/if}
		{#if fresh.note !== null}<span class="freshness-note">{fresh.note}</span>{/if}
		{#if collecting !== null}<span class="freshness-collecting"><span aria-hidden="true">· </span>{collecting}</span>{/if}
	</p>
{/if}

{#if requestedAsOf !== null && methodVersion !== null}
	<p class="as-of">
		<span>As of {requestedAsOf} · method v{methodVersion}</span>
		<a href={liveHref}>Live view</a>
	</p>
{/if}
