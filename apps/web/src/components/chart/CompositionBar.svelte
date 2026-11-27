<script lang="ts">
import { shares } from "../../lib/chart"
import { cx } from "../ui/cx"
import Money from "../ui/Money.svelte"
import type { CompositionSegment } from "./types"

interface Props {
	/** What the bar divides, read out by a screen reader, such as "Assets by account". */
	label: string
	segments: readonly CompositionSegment[]
	currency?: string | undefined
	/** Overrides the hide-amounts switch. Left out, the switch decides. */
	hidden?: boolean | undefined
	/** A card's short form of each legend amount, truncated toward zero. */
	compact?: boolean
}

let { label, segments, currency, hidden, compact = false }: Props = $props()
const SWATCHES = ["bg-primary", "bg-accent", "bg-muted-foreground", "bg-ring"]
const parts = $derived(shares(segments.map((segment) => segment.value)))
const rows = $derived(
	segments.map((segment, index) => ({
		...segment,
		share: parts[index] ?? 0,
		swatch: SWATCHES[index % SWATCHES.length] ?? "bg-primary",
	})),
)
</script>

<figure class="space-y-4">
	<div
		role="img"
		aria-label={label}
		class="flex h-3 w-full gap-[2px] overflow-hidden rounded-sm bg-muted"
	>
		{#each rows.filter((row) => row.share > 0) as row, index (index)}
			<span style:flex-grow={row.share} style:flex-basis="0" class={row.swatch}></span>
		{/each}
	</div>
	<ul class="space-y-2 text-sm">
		{#each rows as row, index (index)}
			<li class="flex items-center justify-between gap-3">
				<span class="flex min-w-0 items-center gap-2">
					<span aria-hidden="true" class={cx("size-3 shrink-0 rounded-sm", row.swatch)}></span>
					<span class="truncate">{row.label}</span>
				</span>
				<span class="shrink-0">
					<Money amount={row.amount} {currency} {hidden} {compact} />
				</span>
			</li>
		{/each}
	</ul>
</figure>
