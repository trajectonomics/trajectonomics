<script lang="ts">
import { currentItemNames } from "../../client/item-names.svelte.js"
import type { ProjectionRun, Read } from "../../lib/contract"
import { chooseScenario } from "../../lib/view/plan"
import EmptyState from "../ui/EmptyState.svelte"
import ReadView from "../ui/ReadView.svelte"
import SegmentedControl from "../ui/SegmentedControl.svelte"
import ProjectionResult from "./ProjectionResult.svelte"

interface Props {
	/** The Scenarios the Snapshot planned, main first; the plan switcher's choices. */
	names: readonly string[]
	/** The projection Reads of the Snapshot, by Scenario name. */
	projections: Readonly<Record<string, Read<ProjectionRun>>>
	/** The Scenario the address bar asks for. An unknown one shows the first. */
	scenario: string
	onScenario: (value: string) => unknown
	terms: string
	onTerms: (value: string) => void
	/** The custom chart the address bar names ("" for none) and its setter. */
	chart?: string
	onChart?: (id: string) => void
}

/** The Scenario picker and the projection of the chosen Scenario. The choice lives in the address bar. */
let { names, projections, scenario, onScenario, terms, onTerms, chart, onChart }: Props = $props()
const name = $derived(chooseScenario(names, scenario))
const read = $derived(name === null ? undefined : projections[name])
const charts = $derived(
	onChart === undefined
		? undefined
		: {
				chart: chart ?? "",
				onChart,
				runs: Object.values(projections).flatMap((read) => (read.ok ? [read.data] : [])),
				names: currentItemNames(),
			},
)
const options = $derived(names.map((value) => ({ value, label: value })))
</script>

{#if name === null || read === undefined}
	<EmptyState title="No plan to project" />
{:else}
	<div class="space-y-6">
		<SegmentedControl
			name="scenario"
			label="Plan"
			{options}
			value={name}
			onChange={onScenario}
		/>
		<ReadView {read} label={`Projection of ${name}`}>
			{#snippet children(run)}
				<ProjectionResult {run} argv={read.argv} {terms} {onTerms} {charts} />
			{/snippet}
		</ReadView>
	</div>
{/if}
