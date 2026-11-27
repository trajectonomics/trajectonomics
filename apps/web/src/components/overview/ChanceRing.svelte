<script lang="ts">
import { toChartNumber } from "../../lib/chart"

interface Props {
	/** The chance as the CLI's percent, such as "96.5%". */
	share: string
}

/** The chance as a small ring: its arc starts at the top and fills clockwise. The figure beside it says the number. */
let { share }: Props = $props()
const RADIUS = 11
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const filled = $derived(toChartNumber(share.replace("%", "")) / 100)
</script>

<svg aria-hidden="true" viewBox="0 0 28 28" class="size-7 shrink-0">
	<circle cx="14" cy="14" r={RADIUS} fill="none" stroke-width="4" class="stroke-border" />
	<circle
		cx="14"
		cy="14"
		r={RADIUS}
		fill="none"
		stroke-width="4"
		stroke-linecap="round"
		transform="rotate(-90 14 14)"
		stroke-dasharray={`${filled * CIRCUMFERENCE} ${CIRCUMFERENCE}`}
		class="stroke-accent print:stroke-foreground"
	/>
</svg>
