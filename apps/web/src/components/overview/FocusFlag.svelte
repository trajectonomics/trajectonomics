<script lang="ts">
import type { PathPoint } from "../../lib/chart/path"
import { flagPath } from "../../lib/view/overview/focus-chart"
import type { PlotBox } from "../../lib/view/overview/focus-chart-axis"
import { placeBox } from "../../lib/view/overview/focus-label-layout"

interface Props {
	/** The last curve point the flag stands at. */
	x: number
	y: number
	/** The plan's last year, in 13px beside the flag. */
	year: string
	points: readonly PathPoint[]
	plot: PlotBox
}

/** A small accent flag at a point, with its year above the curve, clear of the line. */
let { x, y, year, points, plot }: Props = $props()
const YEAR = { width: 34, height: 16 }
const box = $derived(placeBox(points, plot, x - 6 - YEAR.width, YEAR))
</script>

<path d={flagPath({ x, y })} class="fill-accent print:fill-foreground" />
<text
	x={box.x + YEAR.width}
	y={box.y + YEAR.height - 2}
	text-anchor="end"
	data-focus-flag-year
	class="fill-foreground stroke-background text-[13px] font-semibold [paint-order:stroke] stroke-[3px] print:stroke-background">{year}</text
>
