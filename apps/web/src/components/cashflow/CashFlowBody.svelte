<script lang="ts">
import { layoutFlow } from "../../lib/chart/flow"
import type { ProjectionRun } from "../../lib/contract"
import { chooseRollup, rollupsOf, sectionsOf, yearLabel } from "../../lib/view/cashflow/cashflow"
import { flowOf } from "../../lib/view/cashflow/cashflow-flow"
import EmptyState from "../ui/EmptyState.svelte"
import CashFlowTable from "./CashFlowTable.svelte"
import FlowDiagram from "./FlowDiagram.svelte"
import YearSelect from "./YearSelect.svelte"

interface Props {
	/** The projection run of the Scenario the page shows. */
	run: ProjectionRun
	/** The year the address bar asks for. An unknown one shows the first. */
	year: string
	onYear: (index: string) => void
	/** The Accounts' names by id. */
	accountNames: ReadonlyMap<string, string>
}

/** The selected year: the year picker, its flow diagram, and the table of its lines. A pick is shared by both. */
let { run, year, onYear, accountNames }: Props = $props()
let picked: string | null = $state(null)

const rollups = $derived(rollupsOf(run))
const rollup = $derived(chooseRollup(rollups, year))
const layout = $derived(rollup === null ? null : layoutFlow(flowOf(rollup, accountNames)))
const sections = $derived(rollup === null ? [] : sectionsOf(rollup))

/** A pick selects its band and its row; a second pick on the same one clears it. */
function pick(key: string): void {
	picked = picked === key ? null : key
}
</script>

{#if rollup === null || layout === null}
	<EmptyState title="No year to show" />
{:else}
	<div class="space-y-6">
		<YearSelect {rollups} selected={rollup.index} {onYear} />
		<FlowDiagram
			{layout}
			{picked}
			onPick={pick}
			label={`Cash flow, ${yearLabel(rollup)}`}
		/>
		<CashFlowTable {sections} {accountNames} {picked} onPick={pick} />
	</div>
{/if}
