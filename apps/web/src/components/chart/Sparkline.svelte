<script lang="ts">
import { sparklinePath } from "../../lib/chart"

interface Props {
	/** What the line stands for, read out by a screen reader, such as "Net worth, last 24 months". */
	label: string
	/** The values in order, as numbers. A sparkline shows only the shape, never a figure. */
	values: readonly number[]
}

let { label, values }: Props = $props()
const WIDTH = 120
const HEIGHT = 32
</script>

<!-- A line with no axes, for the shape of a series at a glance. Its colour is the brand foreground. -->
<svg
	role="img"
	aria-label={label}
	viewBox="0 0 {WIDTH} {HEIGHT}"
	preserveAspectRatio="none"
	class="block h-10 w-full overflow-visible"
>
	<path
		d={sparklinePath(values, WIDTH, HEIGHT)}
		fill="none"
		stroke-width={2}
		stroke-linejoin="round"
		stroke-linecap="round"
		vector-effect="non-scaling-stroke"
		class="stroke-foreground"
	/>
</svg>
