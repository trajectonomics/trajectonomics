<script lang="ts">
import { flowMeasure } from "../../client/flow-text.svelte.js"
import { preferences } from "../../client/preferences.svelte.js"
import {
	STACK_CLIP_SLACK,
	STACK_LABEL_HALF,
	type StackLayout,
	stackName,
} from "../../lib/chart/flow-stack"
import { formatMoney, maskMoney } from "../../lib/format"
import { cx } from "../ui/cx"
import { keyed } from "./flow-keys"
import { FLOW_FILL } from "./flow-style"

interface Props {
	/** The geometry of the year, from `layoutStack`. */
	layout: StackLayout
	/** The key of the band the person picked, which its table row shows. */
	picked: string | null
	onPick: (key: string) => void
	/** Names the diagram for a screen reader, such as "Cash flow, 31 Oct 2026 to 30 Oct 2027". */
	label: string
	/** The page's one always-drawn probe, so a name is fitted at the size it draws even while this diagram is hidden. */
	probe: SVGTextElement | null
}

/** The phone flow diagram of one year: the sources above, the uses below, one bar for each band. Each bar is a control. */
let { layout, picked, onPick, label, probe }: Props = $props()

/** The diagram's one id prefix, so each row's name clip is its own. */
const uid = $props.id()

const measure = $derived(flowMeasure(probe))

/** A money string as the page shows it: its digits grouped, or masked when amounts are hidden. */
const shown = (amount: string): string =>
	preferences.hidden ? maskMoney(amount) : formatMoney(amount)
</script>

<!-- The figures are the CLI's strings. A bar is drawn by its share of the taller list; the table below repeats each one. -->
<div class="mx-auto w-full max-w-md rounded-lg border border-border md:hidden">
	<svg
		viewBox={`0 0 ${layout.width} ${layout.height}`}
		role="group"
		aria-label={label}
		text-rendering="geometricPrecision"
		class="h-auto w-full text-xs"
	>
		{#each layout.headings as heading (heading.side)}
			<text x={heading.x} y={heading.y} dominant-baseline="middle" aria-hidden="true" class="fill-muted-foreground font-medium">
				{heading.text}
			</text>
		{/each}
		{#each layout.rows as row, index (row.key)}
			{@const name = stackName(row.label, shown(row.amount), measure)}
			<g
				role="button"
				tabindex="0"
				aria-label={`${row.label}, ${shown(row.amount)}`}
				aria-pressed={picked === row.key}
				onclick={() => onPick(row.key)}
				onkeydown={(event) => keyed(event, () => onPick(row.key))}
				class="group cursor-pointer outline-none hover:opacity-85"
			>
				<clipPath id={`${uid}-${index}`}>
					<rect
						x={row.labelX - STACK_CLIP_SLACK}
						y={row.labelY - 2 * STACK_LABEL_HALF}
						width={name.room + 2 * STACK_CLIP_SLACK}
						height={4 * STACK_LABEL_HALF}
					/>
				</clipPath>
				<text
					data-flow-label
					x={row.labelX}
					y={row.labelY}
					dominant-baseline="middle"
					aria-hidden="true"
					class="fill-foreground"
					clip-path={`url(#${uid}-${index})`}
				>
					{name.text}
				</text>
				<text data-flow-amount x={row.amountX} y={row.labelY} text-anchor="end" dominant-baseline="middle" aria-hidden="true" class="fill-foreground">
					{shown(row.amount)}
				</text>
				<rect
					x={row.barX}
					y={row.barY}
					width={row.barWidth}
					height={row.barHeight}
					class={cx(
						FLOW_FILL[row.kind],
						picked === row.key && "stroke-foreground stroke-2",
						"group-focus-visible:stroke-ring group-focus-visible:stroke-2",
					)}
				/>
			</g>
		{/each}
	</svg>
</div>
