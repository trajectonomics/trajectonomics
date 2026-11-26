<script lang="ts">
import { flowTextWidth } from "../../client/flow-text.js"
import { preferences } from "../../client/preferences.svelte.js"
import { FLOW_NODE_WIDTH, type FlowLayout, LABEL_HALF } from "../../lib/chart/flow"
import { fittedLabel } from "../../lib/chart/flow-label"
import { formatMoney, maskMoney } from "../../lib/format"
import { cx } from "../ui/cx"
import { keyed } from "./flow-keys"
import { FLOW_FILL } from "./flow-style"

interface Props {
	/** The geometry of the year, from `layoutFlow`. */
	layout: FlowLayout
	/** The key of the band the person picked, which its table row shows. */
	picked: string | null
	onPick: (key: string) => void
	/** Names the diagram for a screen reader, such as "Cash flow, 31 Oct 2026 to 30 Oct 2027". */
	label: string
	/** True when a stacked layout stands in below the `md` breakpoint, so this one is hidden there. */
	stacked?: boolean
}

/** The wide flow diagram of one year, from a medium screen up. Each band is a control: a click, or Enter or Space, picks its table row. */
let { layout, picked, onPick, label, stacked = false }: Props = $props()

/** The diagram's one id prefix, so each name's clip is its own. */
const uid = $props.id()

/** A money string as the page shows it: its digits grouped, or masked when amounts are hidden. */
const shown = (amount: string): string =>
	preferences.hidden ? maskMoney(amount) : formatMoney(amount)
</script>

<!-- The figures are the CLI's strings. A band is drawn by its share of the taller column; the table below repeats each one. -->
<div class={cx("max-w-full overflow-x-auto rounded-lg border border-border", stacked && "hidden md:block")}>
	<svg
		viewBox={`0 0 ${layout.width} ${layout.height}`}
		role="group"
		aria-label={label}
		class="h-auto min-w-[640px] w-full text-xs"
	>
		{#each layout.links as link (link.key)}
			<path
				d={link.d}
				role="button"
				tabindex="0"
				aria-label={`${link.label}, ${shown(link.amount)}`}
				aria-pressed={picked === link.key}
				onclick={() => onPick(link.key)}
				onkeydown={(event) => keyed(event, () => onPick(link.key))}
				class={cx(
					"cursor-pointer outline-none hover:opacity-85 focus-visible:stroke-ring focus-visible:stroke-2",
					FLOW_FILL[link.kind],
					picked === link.key && "stroke-foreground stroke-2",
				)}
			/>
		{/each}
		<rect
			x={layout.cash.x}
			y={layout.cash.y}
			width={layout.cash.width}
			height={layout.cash.height}
			class="fill-foreground"
		/>
		{#each layout.nodes as node, index (node.key)}
			{@const words = fittedLabel(node, shown(node.amount), flowTextWidth)}
			<rect
				x={node.x}
				y={node.y}
				width={FLOW_NODE_WIDTH}
				height={node.height}
				class="fill-foreground/70"
			/>
			<clipPath id={`${uid}-${index}`}>
				<rect
					x={words.clipX}
					y={node.labelY - LABEL_HALF}
					width={words.clipWidth}
					height={2 * LABEL_HALF}
				/>
			</clipPath>
			<text
				x={words.labelX}
				y={node.labelY}
				text-anchor={node.anchor}
				dominant-baseline="middle"
				aria-hidden="true"
				class="fill-foreground"
				clip-path={`url(#${uid}-${index})`}
			><tspan data-flow-label>{words.label}</tspan></text>
			<text
				x={words.amountX}
				y={node.labelY}
				text-anchor="end"
				dominant-baseline="middle"
				aria-hidden="true"
				class="fill-foreground"
			><tspan data-flow-amount>{words.amount}</tspan></text>
		{/each}
	</svg>
</div>
