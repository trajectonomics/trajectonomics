<script lang="ts">
import { currentItemNames } from "../../client/item-names.svelte.js"
import { layoutFlow } from "../../lib/chart/flow"
import { layoutStack } from "../../lib/chart/flow-stack"
import type { ProjectionRun } from "../../lib/contract"
import {
	chooseRollup,
	type Pick,
	pickedKey,
	rollupsOf,
	sectionsOf,
	yearLabel,
} from "../../lib/view/cashflow/cashflow"
import { flowOf } from "../../lib/view/cashflow/cashflow-flow"
import { rowKeyOf } from "../../lib/view/cashflow/cashflow-labels"
import type { ItemNames } from "../../lib/view/item-names"
import EmptyState from "../ui/EmptyState.svelte"
import CashFlowTable from "./CashFlowTable.svelte"
import FlowDiagram from "./FlowDiagram.svelte"
import FlowProbe from "./FlowProbe.svelte"
import YearSelect from "./YearSelect.svelte"

interface Props {
	/** The projection run of the Scenario the page shows. */
	run: ProjectionRun
	/** The year the address bar asks for. An unknown one shows the first. */
	year: string
	onYear: (index: string) => void
	/** The plan's names by id: its Accounts', and the labels its document states for its Flows. */
	names: ItemNames
}

/** The selected year: the year picker, its flow diagram, and the table of its lines. A pick is shared by both. */
let { run, year, onYear, names }: Props = $props()
/** The band the person picked, with the roll-up it was picked in: a pick does not carry over to another year. */
let pickedIn: Pick | null = $state(null)
/** The page's one probe, outside the keyed diagram so a year change neither clears its widths nor adds an observer. */
let probe = $state<SVGTextElement | null>(null)

const rollups = $derived(rollupsOf(run))
const rollup = $derived(chooseRollup(rollups, year))
const flow = $derived(rollup === null ? null : flowOf(rollup, names))
const layout = $derived(flow === null ? null : layoutFlow(flow))
const stack = $derived(flow === null ? null : layoutStack(flow))
const sections = $derived(rollup === null ? [] : sectionsOf(rollup))
const picked = $derived(pickedKey(pickedIn, rollup?.index))

/** A pick selects its band and its row; a second pick on the same one clears it. */
function pick(band: string): void {
	const key = rowKeyOf(band)
	const index = rollup?.index
	if (index === undefined) return
	pickedIn = picked === key ? null : { index, key }
}
</script>

{#if rollup === null || layout === null || stack === null}
	<EmptyState title="No year to show" />
{:else}
	<div class="space-y-6">
		<YearSelect {rollups} selected={rollup.index} {onYear} />
		<FlowProbe bind:text={probe} />
		{#key rollup.index}
			<FlowDiagram {probe} {layout} {stack} {picked} onPick={pick} label={`Cash flow, ${yearLabel(rollup, currentItemNames().people)}`} />
			<p class="text-sm text-muted-foreground">
				A refund is shown as money in, so the tax band is the tax paid, and the tax total is the tax paid
				less the refund.
			</p>
			<CashFlowTable {sections} {names} {picked} onPick={pick} />
		{/key}
	</div>
{/if}
