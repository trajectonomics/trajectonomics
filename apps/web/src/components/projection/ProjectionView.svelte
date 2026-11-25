<script lang="ts">
import type { AccountList, ProjectionRun, Read } from "../../lib/contract"
import { accountNames } from "../../lib/view/account-names"
import { chooseScenario, projectionNames } from "../../lib/view/projection/scenario"
import EmptyState from "../ui/EmptyState.svelte"
import ReadView from "../ui/ReadView.svelte"
import SegmentedControl from "../ui/SegmentedControl.svelte"
import ProjectionResult from "./ProjectionResult.svelte"

interface Props {
	/** The projection Reads of the Snapshot, by Scenario name. */
	projections: Readonly<Record<string, Read<ProjectionRun>>>
	/** The Scenario the address bar asks for. An unknown one shows the first. */
	scenario: string
	onScenario: (value: string) => unknown
	terms: string
	onTerms: (value: string) => void
	/** The custom chart the address bar names ("" for none), its setter, and the accounts Read that names Accounts. */
	chart?: string
	onChart?: (id: string) => void
	accounts?: Read<AccountList>
}

/** The Scenario picker and the projection of the chosen Scenario. The choice lives in the address bar. */
let { projections, scenario, onScenario, terms, onTerms, chart, onChart, accounts }: Props =
	$props()
const names = $derived(projectionNames(projections))
const name = $derived(chooseScenario(names, scenario))
const read = $derived(name === null ? undefined : projections[name])
const charts = $derived(
	onChart === undefined
		? undefined
		: {
				chart: chart ?? "",
				onChart,
				runs: Object.values(projections).flatMap((read) => (read.ok ? [read.data] : [])),
				accountNames: accountNames(accounts),
			},
)
const options = $derived(names.map((value) => ({ value, label: value })))
</script>

{#if name === null || read === undefined}
	<EmptyState title="No Scenario to project" />
{:else}
	<div class="space-y-6">
		<SegmentedControl
			name="scenario"
			label="Scenario"
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
