<script lang="ts">
import { flagPath } from "../../lib/view/overview/focus-chart"

interface Props {
	x: number
	y: number
	/** The plan's last year, in 13px beside the flag. */
	year: string
}

/** A small accent flag at a point, with its year to its left. */
let { x, y, year }: Props = $props()
</script>

<path d={flagPath({ x, y })} class="fill-accent print:fill-foreground" />
<text
	x={x - 6}
	y={y - 8}
	text-anchor="end"
	class="fill-foreground text-[13px] font-semibold">{year}</text
>
