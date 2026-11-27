<script lang="ts">
import { keyTarget, type LineLayout, nearestIndex } from "../../lib/chart"
import { describeIndex, tooltipRows } from "./hover-text"
import LineSvg from "./LineSvg.svelte"
import LineTooltip from "./LineTooltip.svelte"

interface Props {
	label: string
	layout: LineLayout
	width: number
	height: number
	masked: boolean
	/** The hovered or focused index into the layout's x positions, or null for none. */
	active: number | null
	onActive: (index: number | null) => void
}

let { label, layout, width, height, masked, active, onActive }: Props = $props()
const count = $derived(layout.xPixels.length)
const index = $derived(active !== null && active < count ? active : null)
const valueText = $derived(
	index === null ? "No point selected" : describeIndex(layout, index, masked),
)

/** A pointer picks the nearest x. Leaving the chart clears the hover. */
function onPointerMove(event: PointerEvent & { currentTarget: HTMLDivElement }): void {
	const left = event.currentTarget.getBoundingClientRect().left
	onActive(nearestIndex(layout.xPixels, event.clientX - left))
}

/** The keyboard steps through the x positions; focus starts at the latest. */
function onKeyDown(event: KeyboardEvent): void {
	const next = keyTarget(event.key, index ?? count - 1, count)
	if (next === null) return
	event.preventDefault()
	onActive(next)
}
</script>

<div
	role="slider"
	aria-label={label}
	aria-valuemin={0}
	aria-valuemax={count - 1}
	aria-valuenow={index ?? count - 1}
	aria-valuetext={valueText}
	tabindex="0"
	onpointermove={onPointerMove}
	onpointerleave={() => onActive(null)}
	onfocus={() => onActive(count - 1)}
	onblur={() => onActive(null)}
	onkeydown={onKeyDown}
	class="relative rounded-md outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
>
	<LineSvg {label} {layout} {width} {height} {masked} {index} />
	{#if index !== null}
		<LineTooltip
			x={layout.xPixels[index] ?? 0}
			{width}
			xLabel={layout.xTitles?.[index] ?? layout.xLabels[index] ?? ""}
			rows={tooltipRows(layout, index, masked)}
		/>
	{/if}
</div>
