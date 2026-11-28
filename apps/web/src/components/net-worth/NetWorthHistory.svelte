<script lang="ts">
import { type FocusHistoryPoint, historyFocus } from "../../lib/view/focus/history"
import FocusAnswer from "../ui/FocusAnswer.svelte"
import type { FocusTone } from "../ui/focus"
import Money from "../ui/Money.svelte"

interface Props {
	points: readonly FocusHistoryPoint[]
	/** How many month-ends the history holds, so a failed month leaves its gap. */
	months: number
	total: string
	/** The As-of the total is read at, named by the mark beside the last dot (never the last month-end's date). */
	asOf: string
	currency: string
	height: number
	tone: FocusTone
}

/** The month-end line with the answer at its top and the last point's month beside its dot. */
let { points, months, total, asOf, currency, height, tone }: Props = $props()
const HALO =
	"[text-shadow:0_0_3px_var(--ds-color-background),0_0_6px_var(--ds-color-background),0_0_2px_var(--ds-color-background)]"
let width = $state(0)
const chartWidth = $derived(width > 0 ? Math.floor(width) : 640)
const chart = $derived(historyFocus(points, months, chartWidth, height))
</script>

{#if chart}
	<div bind:clientWidth={width} class="relative w-full" style:height="{height}px">
		<svg
			aria-hidden="true"
			width={chartWidth}
			height={height}
			viewBox="0 0 {chartWidth} {height}"
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
			<circle cx={chart.last.x} cy={chart.last.y} r="6" class="fill-accent print:fill-foreground" />
		</svg>
		<span class="absolute inset-x-0 top-1 flex justify-end px-2 text-right {HALO}">
			<FocusAnswer {tone}><Money amount={total} {currency} compact /></FocusAnswer>
		</span>
		<span
			class="absolute whitespace-nowrap text-xs text-muted-foreground {HALO}"
			style:left="{chart.last.x}px"
			style:top="{chart.last.y + 8}px"
			style:transform={chart.last.x > chartWidth / 2 ? "translate(-100%, 0)" : "translate(8px, 0)"}
			>As of {asOf}</span
		>
	</div>
{/if}
