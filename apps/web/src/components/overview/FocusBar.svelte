<script lang="ts">
import type { BarSpan } from "../../lib/view/overview/focus-chart"

interface Props {
	bar: BarSpan
	/** The shortfall, compact, at the bar's right end. */
	unmet: string
}

/** The 10px bar a shortfall draws under zero, from the run-out date to the plan's last year. */
let { bar, unmet }: Props = $props()
</script>

<rect
	x={bar.x}
	y={bar.y}
	width={bar.width}
	height={bar.height}
	class="fill-accent print:fill-foreground print:[fill-opacity:0.2]"
/>
<text
	x={bar.x + bar.width}
	y={bar.y + bar.height + 16}
	text-anchor="end"
	class="fill-accent text-[13px] font-semibold print:fill-foreground">{unmet}</text
>
