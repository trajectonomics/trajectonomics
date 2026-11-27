<script lang="ts">
import type { FlowLayout } from "../../lib/chart/flow"
import type { StackLayout } from "../../lib/chart/flow-stack"
import FlowStack from "./FlowStack.svelte"
import FlowTable from "./FlowTable.svelte"
import FlowWide from "./FlowWide.svelte"

interface Props {
	/** The geometry of the year for a wide screen, from `layoutFlow`. */
	layout: FlowLayout
	/** The geometry of the same year for a phone, from `layoutStack`. A diagram with none (the estate's) is the wide one on every screen. */
	stack?: StackLayout
	/** The key of the band the person picked, which its table row shows. */
	picked: string | null
	onPick: (key: string) => void
	/** Names the diagram for a screen reader, such as "Cash flow, 31 Oct 2026 to 30 Oct 2027". */
	label: string
	/** The page's one always-drawn probe, shared by both layouts so a hidden one still fits at the drawn size. */
	probe: SVGTextElement | null
}

/** The flow diagram of one year: the wide one from a medium screen up, the stacked one below, and one table for a screen reader. */
let { layout, stack, picked, onPick, label, probe }: Props = $props()
</script>

<FlowWide {layout} {picked} {onPick} {label} {probe} stacked={stack !== undefined} />
{#if stack}<FlowStack layout={stack} {picked} {onPick} {label} {probe} />{/if}
<FlowTable {layout} {label} />
