<script lang="ts">
import { preferences } from "../../client/preferences.svelte.js"
import type { Read } from "../../lib/contract"
import { historyFocus } from "../../lib/view/focus/history"
import { netWorthFocusView } from "../../lib/view/net-worth/focus"
import type { HistoryView } from "../../lib/view/net-worth/page"
import type { NetWorthView } from "../../lib/view/net-worth/view"
import EmptyState from "../ui/EmptyState.svelte"
import FocusAnswer from "../ui/FocusAnswer.svelte"
import FocusPoint from "../ui/FocusPoint.svelte"
import Money from "../ui/Money.svelte"
import ReadView from "../ui/ReadView.svelte"

interface Props {
	read: Read<NetWorthView>
	history: HistoryView
}

/** The page's focus point: the month-end line, its last point a large dot carrying today's total. */
let { read, history }: Props = $props()
const HEIGHT = 220
const HALO =
	"[text-shadow:0_0_3px_var(--ds-color-background),0_0_6px_var(--ds-color-background),0_0_2px_var(--ds-color-background)]"
let width = $state(0)
const chartWidth = $derived(width > 0 ? Math.floor(width) : 640)
</script>

<ReadView {read} label="Net worth">
	{#snippet children(data)}
		{@const focus = netWorthFocusView(data, history, preferences.hidden)}
		{@const chart = focus === null ? null : historyFocus(focus.values, chartWidth, HEIGHT)}
		{#if focus && chart && focus.values.length > 0}
			<FocusPoint label={focus.label}>
				{#snippet visual()}
					<div bind:clientWidth={width} class="relative h-[220px] w-full">
						<svg
							aria-hidden="true"
							width={chartWidth}
							height={HEIGHT}
							viewBox="0 0 {chartWidth} {HEIGHT}"
							preserveAspectRatio="none"
							class="block h-full w-full"
						>
							<path d={chart.area} fill-opacity="0.12" class="fill-foreground" />
							<path
								d={chart.line}
								fill="none"
								stroke-width="2"
								stroke-linejoin="round"
								class="stroke-foreground"
							/>
							<circle
								cx={chart.last.x}
								cy={chart.last.y}
								r="6"
								class="fill-accent print:fill-foreground"
							/>
						</svg>
						<span
							class="absolute inset-x-0 top-1 flex justify-end px-2 text-right {HALO}"
						>
							<FocusAnswer><Money
									amount={focus.total}
									currency={focus.currency}
									compact
								/></FocusAnswer>
						</span>
					</div>
				{/snippet}
			</FocusPoint>
		{:else if focus}
			<EmptyState title="Nothing to chart yet" />
		{/if}
	{/snippet}
</ReadView>
