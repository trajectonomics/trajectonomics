<script lang="ts">
import type { LineLayout } from "../../lib/chart"
import { abbreviate, maskMoney } from "../../lib/format"
import { MARGIN } from "./geometry"

interface Props {
	layout: LineLayout
	width: number
	/** Whether the y labels are money and hidden. */
	masked: boolean
}

let { layout, width, masked }: Props = $props()
const edge = $derived(layout.rightAxis?.edge ?? width - MARGIN.right)
</script>

<!-- The grid and the y labels: round ticks on the left, and a second axis on the right when a series has its own. -->
{#each layout.yTicks as tick (tick.value)}
	<line x1={MARGIN.left} x2={edge} y1={tick.y} y2={tick.y} class="stroke-border" />
	<text
		x={MARGIN.left - 8}
		y={tick.y}
		text-anchor="end"
		dominant-baseline="middle"
		class="fill-muted-foreground text-xs tabular-nums"
		>{masked ? maskMoney(abbreviate(tick.value)) : abbreviate(tick.value)}</text
	>
{/each}
{#each layout.rightAxis?.ticks ?? [] as tick (tick.label)}
	<text
		x={edge + 8}
		y={tick.y}
		dominant-baseline="middle"
		class="fill-muted-foreground text-xs tabular-nums">{tick.label}</text
	>
{/each}
