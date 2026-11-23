<script lang="ts">
import { preferences } from "../../client/preferences.svelte.js"
import { FLOW_NODE_WIDTH, type FlowLayout } from "../../lib/chart/flow"
import { formatMoney, maskMoney } from "../../lib/format"
import { cx } from "../ui/cx"
import { FLOW_FILL } from "./flow-style"

interface Props {
	/** The geometry of the year, from `layoutFlow`. */
	layout: FlowLayout
	/** The key of the band the person picked, which its table row shows. */
	picked: string | null
	onPick: (key: string) => void
	/** Names the diagram for a screen reader, such as "Cash flow, 31 Oct 2026 to 30 Oct 2027". */
	label: string
}

/** The flow diagram of one year. Each band is a control: a click, or Enter or Space, picks its table row. */
let { layout, picked, onPick, label }: Props = $props()

/** A money string as the page shows it: its digits grouped, or masked when amounts are hidden. */
const shown = (amount: string): string =>
	preferences.hidden ? maskMoney(amount) : formatMoney(amount)

function keyed(event: KeyboardEvent, key: string): void {
	if (event.key !== "Enter" && event.key !== " ") return
	event.preventDefault()
	onPick(key)
}
</script>

<!-- The figures are the CLI's strings. A band is drawn by its share of the taller column; the table below repeats each one. -->
<div class="max-w-full overflow-x-auto rounded-lg border border-border">
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
				onkeydown={(event) => keyed(event, link.key)}
				class={cx(
					"cursor-pointer outline-none hover:opacity-85 focus-visible:outline-2 focus-visible:outline-ring",
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
		{#each layout.nodes as node (node.key)}
			<rect
				x={node.x}
				y={node.y}
				width={FLOW_NODE_WIDTH}
				height={node.height}
				class="fill-foreground/70"
			/>
			<text
				x={node.labelX}
				y={node.labelY}
				text-anchor={node.anchor}
				dominant-baseline="middle"
				aria-hidden="true"
				class="fill-foreground"
			>
				{node.label} {shown(node.amount)}
			</text>
		{/each}
	</svg>
</div>

<div class="sr-only">
	<table>
		<caption>{label}, each band and its amount</caption>
		<thead>
			<tr>
				<th scope="col">Side</th>
				<th scope="col">Band</th>
				<th scope="col">Amount</th>
			</tr>
		</thead>
		<tbody>
			{#each layout.nodes as node (node.key)}
				<tr>
					<td>{node.side === "source" ? "From" : "To"}</td>
					<td>{node.label}</td>
					<td>{shown(node.amount)}</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
