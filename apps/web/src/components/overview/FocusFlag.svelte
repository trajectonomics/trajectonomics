<script lang="ts">
import { flagPath } from "../../lib/view/overview/focus-chart"
import { FLAG_YEAR } from "../../lib/view/overview/focus-label-layout"

interface Props {
	/** The last curve point the flag stands at. */
	x: number
	y: number
	/** The plan's last year, in 13px beside the flag. */
	year: string
	/** The year's box, placed by the layout so it clears the line. */
	box: { readonly x: number; readonly y: number }
}

/** A small accent flag at a point, with its year above the curve, clear of the line. */
let { x, y, year, box }: Props = $props()
</script>

<path d={flagPath({ x, y })} class="fill-accent print:fill-foreground" />
<text
	x={box.x + FLAG_YEAR.width}
	y={box.y + FLAG_YEAR.height - 2}
	text-anchor="end"
	data-focus-flag-year
	class="fill-foreground stroke-background text-[13px] font-semibold [paint-order:stroke] stroke-[3px] print:stroke-background">{year}</text
>
